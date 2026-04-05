import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import supabase from '@/lib/db/client';
import { createGoalWithMeasurables } from '@/lib/db/goals';
import { fetchGoalById } from '@/features/goals/services/goal-service';
import { useGoalStore } from '@/features/goals/store';
import { useProjectStore } from '@/features/projects/store';
import type { GoalFinalizeResponse } from '@/lib/ai/schemas/goal-creation';
import {
  ACTION_CAPTURE_PROMPT,
  ACTION_CAPTURE_CONFIRMATION,
} from '@/lib/ai/prompts/goal-creation';

type ConversationMessage = { role: 'user' | 'assistant'; content: string };

export default function GoalCreateScreen() {
  const { projectId: incomingProjectId } = useLocalSearchParams<{ projectId?: string }>();
  const { upsertGoal } = useGoalStore();
  const { projects, loadProjects } = useProjectStore();
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [savingGoal, setSavingGoal] = useState(false);
  const [savedGoalId, setSavedGoalId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    typeof incomingProjectId === 'string' ? incomingProjectId : null,
  );
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  useEffect(() => {
    loadProjects();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof incomingProjectId === 'string') {
      setSelectedProjectId(incomingProjectId);
    }
  }, [incomingProjectId]);

  async function submitGoalChat(options?: { finalize?: boolean }) {
    const finalize = options?.finalize === true;
    const text = input.trim();
    if (isLoading || savingGoal) return;
    if (!finalize && !text) return;
    if (finalize && !text && messages.length === 0) return;

    // ── Post-finalization: action capture turn ────────────────────────────────
    // Goal is already saved. This message is the user's first action commitment.
    // POST it to /api/actions, append confirmation, then navigate.
    if (savedGoalId !== null) {
      const actionText = text;
      if (!actionText) return;

      setInput('');
      const messagesWithAction: ConversationMessage[] = [
        ...messages,
        { role: 'user', content: actionText },
      ];
      setMessages(messagesWithAction);
      setIsLoading(true);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const today = new Date().toISOString().split('T')[0];

        try {
          const actionRes = await fetch('/api/actions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
            },
            body: JSON.stringify({
              goal_id: savedGoalId,
              action_text: actionText,
              due_date: today,
            }),
          });
          if (!actionRes.ok) {
            console.warn('[goal-create] action capture non-ok response', { status: actionRes.status });
          }
        } catch (actionErr) {
          console.error('[goal-create] action capture failed', actionErr instanceof Error ? actionErr.message : 'Unknown error');
          // navigate anyway — action is a bonus, not a gate
        }

        setMessages([
          ...messagesWithAction,
          { role: 'assistant', content: ACTION_CAPTURE_CONFIRMATION },
        ]);

        const navigateId = savedGoalId;
        setTimeout(() => {
          router.replace(`/goals/${navigateId}`);
        }, 1500);
      } finally {
        setIsLoading(false);
      }
      return;
    }
    // ─────────────────────────────────────────────────────────────────────────

    setError(null);

    const nextUserMessage = text ? { role: 'user' as const, content: text } : null;
    const updatedMessages: ConversationMessage[] = nextUserMessage
      ? [...messages, nextUserMessage]
      : messages;

    if (text) {
      setInput('');
      setMessages(updatedMessages);
    }
    setIsLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError('Not authenticated. Please log in again.');
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/goals/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(text ? { userMessage: text } : {}),
          conversationHistory: messages,
          finalize,
          projectId: selectedProjectId,
        }),
      });

      if (!response.ok) {
        const errData = (await response.json()) as {
          error?: string;
          details?: string;
          requestId?: string;
          finalizeStage?: string;
        };
        const detailMessage = errData.details ? ` ${errData.details}` : '';
        const stageMessage = errData.finalizeStage ? ` [${errData.finalizeStage}]` : '';
        const requestMessage = errData.requestId ? ` (Request ${errData.requestId})` : '';
        throw new Error((errData.error ?? `Request failed: ${response.status}`) + stageMessage + detailMessage + requestMessage);
      }

      const data = (await response.json()) as {
        requestId: string;
        message: string;
        isComplete: boolean;
        goalData?: GoalFinalizeResponse;
        finalizedBy?: 'assistant' | 'user';
      };

      if (!data.isComplete && data.message) {
        setMessages([...updatedMessages, { role: 'assistant', content: data.message }]);
      }

      if (data.isComplete && data.goalData) {
        setSavingGoal(true);
        const saveResult = await createGoalWithMeasurables(user.id, data.goalData, {
          requestId: data.requestId,
          projectId: selectedProjectId,
        });
        setSavingGoal(false);

        if (saveResult.goalId) {
          console.info('[goal-finalize] persistence succeeded', {
            requestId: data.requestId,
            stage: 'persistence',
            goalId: saveResult.goalId,
            finalizedBy: data.finalizedBy,
          });

          const savedGoal = await fetchGoalById(saveResult.goalId);
          if (savedGoal) {
            upsertGoal(savedGoal);
            console.info('[goal-finalize] hydration succeeded', {
              requestId: data.requestId,
              stage: 'post_save_hydration',
              goalId: saveResult.goalId,
            });
          } else {
            console.warn('[goal-finalize] hydration failed', {
              requestId: data.requestId,
              stage: 'post_save_hydration',
              goalId: saveResult.goalId,
              finalizedBy: data.finalizedBy,
            });
          }

          if (saveResult.warning) {
            console.warn('[goal-create-screen] goal saved with warning', {
              requestId: data.requestId,
              goalId: saveResult.goalId,
              warning: saveResult.warning,
              finalizedBy: data.finalizedBy,
            });
          }

          setSavedGoalId(saveResult.goalId);
          setMessages([
            ...updatedMessages,
            { role: 'assistant', content: ACTION_CAPTURE_PROMPT },
          ]);
        } else {
          console.error('[goal-finalize] persistence failed', {
            requestId: data.requestId,
            stage: 'persistence',
            error: saveResult.error,
            finalizedBy: data.finalizedBy,
          });
          setError(
            `Goal finalization succeeded, but persistence failed. ${saveResult.error ?? 'Please try again.'} (Request ${data.requestId})`,
          );
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSend() {
    await submitGoalChat();
  }

  async function handleCreateGoal() {
    await submitGoalChat({ finalize: true });
  }

  const showIntro = messages.length === 0 && input.trim().length === 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F1EA' }}>
      {/* Nav bar */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderBottomWidth: 0.5,
          borderBottomColor: '#EAE7E0',
          backgroundColor: '#F5F1EA',
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 12 }}
          activeOpacity={0.7}
        >
          <Text style={{ color: '#4A7C5F', fontSize: 18 }}>←</Text>
          <Text style={{ color: '#4A7C5F', fontSize: 14 }}>Goals</Text>
        </TouchableOpacity>
        <View style={{ width: 1, height: 16, backgroundColor: '#EAE7E0', marginRight: 12 }} />
        <Text style={{ color: '#1A1F1C', fontWeight: '600', fontSize: 15 }}>New goal</Text>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          onPress={handleCreateGoal}
          disabled={(messages.length === 0 && !input.trim()) || isLoading || savingGoal}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 999,
            backgroundColor: '#4A7C5F',
            opacity:
              (messages.length > 0 || input.trim()) && !isLoading && !savingGoal ? 1 : 0.4,
          }}
          activeOpacity={0.7}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600' }}>Create goal</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Intro state */}
        {showIntro ? (
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 32,
              gap: 16,
            }}
          >
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: '#E8EDE9',
                borderWidth: 1,
                borderColor: 'rgba(74,124,95,0.2)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#4A7C5F', fontSize: 20, fontWeight: '500' }}>O</Text>
            </View>
            <Text
              style={{
                color: '#1A1F1C',
                fontSize: 22,
                fontWeight: '500',
                textAlign: 'center',
              }}
            >
              What do you want to achieve?
            </Text>
            <Text
              style={{
                color: '#6B7B6E',
                fontSize: 14,
                textAlign: 'center',
                lineHeight: 22,
              }}
            >
              {'Describe your goal in plain words —\nI\'ll help you shape it.'}
            </Text>
          </View>
        ) : (
          /* Chat history */
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingTop: 16, paddingBottom: 8 }}
          >
            {messages.map((msg, i) => (
              <View
                key={i}
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  paddingHorizontal: 16,
                  marginBottom: 12,
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                {/* Ohara messages — accent dot prefix, no bubble */}
                {msg.role === 'assistant' && (
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: '#4A7C5F',
                      marginTop: 6,
                      marginRight: 8,
                      flexShrink: 0,
                    }}
                  />
                )}
                {/* User messages — forest green bubble */}
                <View
                  style={
                    msg.role === 'user'
                      ? {
                          backgroundColor: '#4A7C5F',
                          borderRadius: 16,
                          borderBottomRightRadius: 4,
                          paddingHorizontal: 16,
                          paddingVertical: 12,
                          maxWidth: '80%',
                        }
                      : { maxWidth: '90%' }
                  }
                >
                  <Text
                    style={{
                      color: msg.role === 'user' ? '#E8EDE9' : '#1A1F1C',
                      fontSize: 14,
                      lineHeight: 22,
                    }}
                  >
                    {msg.content}
                  </Text>
                </View>
              </View>
            ))}

            {(isLoading || savingGoal) && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 16,
                  marginBottom: 12,
                  gap: 8,
                }}
              >
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: '#4A7C5F',
                  }}
                />
                <ActivityIndicator color="#4A7C5F" size="small" />
                {savingGoal && (
                  <Text style={{ color: '#6B7B6E', fontSize: 13 }}>Saving your goal…</Text>
                )}
              </View>
            )}

            {error && (
              <View
                style={{
                  marginHorizontal: 16,
                  backgroundColor: '#FEF2F0',
                  borderRadius: 8,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: 'rgba(192,72,58,0.2)',
                  marginBottom: 8,
                }}
              >
                <Text style={{ color: '#C0483A', fontSize: 14 }}>{error}</Text>
              </View>
            )}
          </ScrollView>
        )}

        {/* Input area */}
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderWidth: 1,
            borderColor: '#EAE7E0',
            borderRadius: 16,
            marginHorizontal: 16,
            marginBottom: 8,
            paddingHorizontal: 16,
            paddingVertical: 12,
            flexDirection: 'row',
            alignItems: 'flex-end',
            gap: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.04,
            shadowRadius: 4,
            elevation: 1,
          }}
        >
          <TextInput
            style={{
              flex: 1,
              backgroundColor: 'transparent',
              color: '#1A1F1C',
              fontSize: 14,
              maxHeight: 120,
              padding: 0,
            }}
            placeholder="Tell me about your goal..."
            placeholderTextColor="#9CAF9F"
            value={input}
            onChangeText={setInput}
            multiline
            onSubmitEditing={handleSend}
            editable={!isLoading && !savingGoal}
          />
          {input.trim().length > 0 && (
            <TouchableOpacity
              onPress={handleSend}
              disabled={isLoading || savingGoal}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: '#4A7C5F',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
              activeOpacity={0.7}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 16, lineHeight: 18 }}>↑</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Mode selector pills — FIX: flexGrow: 0 prevents container from expanding vertically */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            flexDirection: 'row',
            gap: 8,
            paddingHorizontal: 16,
            paddingBottom: 12,
          }}
          style={{ flexGrow: 0 }}
        >
          {(['⚡ Quick', '◎ Deep', '✦ Reflect', '❋ Holistic'] as const).map((label) => (
            <TouchableOpacity
              key={label}
              onPress={() => console.log('TODO: wire mode selection in Phase 2', label)}
              style={{
                backgroundColor: '#FFFFFF',
                borderWidth: 1,
                borderColor: '#EAE7E0',
                borderRadius: 999,
                paddingHorizontal: 16,
                paddingVertical: 8,
              }}
              activeOpacity={0.7}
            >
              <Text style={{ color: '#4A7C5F', fontSize: 12, fontWeight: '500' }}>{label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {showIntro && projects.length > 0 && (
          <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
            <Text
              style={{
                color: '#6B7B6E',
                fontSize: 13,
                fontWeight: '500',
                marginBottom: 8,
              }}
            >
              Link to a project (optional)
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ flexDirection: 'row', gap: 8 }}
              style={{ flexGrow: 0 }}
            >
              {projects.map((project) => {
                const isSelected = selectedProjectId === project.id;
                return (
                  <TouchableOpacity
                    key={project.id}
                    onPress={() =>
                      setSelectedProjectId((current) => (current === project.id ? null : project.id))
                    }
                    style={{
                      backgroundColor: isSelected ? '#3D5247' : '#FFFFFF',
                      borderWidth: isSelected ? 0 : 1,
                      borderColor: '#EAE7E0',
                      borderRadius: 999,
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={{
                        color: isSelected ? '#E8EDE9' : '#6B7B6E',
                        fontSize: 14,
                        fontWeight: '500',
                      }}
                    >
                      {project.title}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
