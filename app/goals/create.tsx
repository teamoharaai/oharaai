import {
  View,
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
import { Typography } from '@/components/ui/Typography';
import supabase from '@/lib/db/client';
import { authedFetch } from '@/lib/api/client';
import { fetchGoalById } from '@/features/goals/services/goal-service';
import { useGoalStore } from '@/features/goals/store';
import { useProjectStore } from '@/features/projects/store';
import type { GoalFinalizeResponse } from '@/lib/ai/schemas/goal-creation';
import type { AiResponse } from '@/lib/ai/contracts';
import type { ApiResponse } from '@/lib/api/contracts';
import type { CreateGoalWithMeasurablesResult } from '@/lib/db/goals';
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
          router.replace(`/(app)/goals/${navigateId}` as never);
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
      const response = await authedFetch('/api/goals/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(text ? { userMessage: text } : {}),
          conversationHistory: messages,
          finalize,
          projectId: selectedProjectId,
        }),
      });

      type GoalCreateData = {
        requestId: string;
        message: string;
        isComplete: boolean;
        goalData?: GoalFinalizeResponse;
        finalizedBy?: 'assistant' | 'user';
      };

      const body = (await response.json()) as AiResponse<GoalCreateData>;

      if (!body.ok) {
        const { code, message, details } = body.error;
        const detailsObj = details && typeof details === 'object' ? details as Record<string, unknown> : null;
        const stageMessage = detailsObj?.finalizeStage ? ` [${detailsObj.finalizeStage}]` : '';
        const requestMessage = detailsObj?.requestId ? ` (Request ${detailsObj.requestId})` : '';
        const reasonMessage = detailsObj?.reason && typeof detailsObj.reason === 'string' ? ` ${detailsObj.reason}` : '';
        const suffix = code === 'PARSE_ERROR' ? stageMessage + reasonMessage + requestMessage : '';
        throw new Error(message + suffix);
      }

      const data = body.data;

      if (!data.isComplete && data.message) {
        setMessages([...updatedMessages, { role: 'assistant', content: data.message }]);
      }

      if (data.isComplete && data.goalData) {
        setSavingGoal(true);
        const createRes = await authedFetch('/api/goals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            aiData: data.goalData,
            options: {
              requestId: data.requestId,
              projectId: selectedProjectId,
            },
          }),
        });
        const createBody = (await createRes.json()) as ApiResponse<CreateGoalWithMeasurablesResult>;
        setSavingGoal(false);

        if (!createBody.ok) {
          console.error('[goal-finalize] persistence failed', {
            requestId: data.requestId,
            stage: 'persistence',
            error: createBody.error.message,
            finalizedBy: data.finalizedBy,
          });
          setError(
            `Goal finalization succeeded, but persistence failed. ${createBody.error.message ?? 'Please try again.'} (Request ${data.requestId})`,
          );
          return;
        }

        const saveResult = createBody.data;

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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8F4EC' }}>
      {/* Nav bar */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderBottomWidth: 0.5,
          borderBottomColor: '#EAE7E0',
          backgroundColor: '#F8F4EC',
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 12 }}
          activeOpacity={0.7}
        >
          <Typography variant="nav-back">←</Typography>
          <Typography variant="nav-back">Goals</Typography>
        </TouchableOpacity>
        <View style={{ width: 1, height: 16, backgroundColor: '#EAE7E0', marginRight: 12 }} />
        <Typography variant="nav-title" style={{ fontFamily: 'Inter-SemiBold' }}>New goal</Typography>
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
          <Typography variant="emphasis-sm" style={{ color: '#FFFFFF', fontSize: 13 }}>Create goal</Typography>
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
                backgroundColor: '#EDE7DA',
                borderWidth: 1,
                borderColor: 'rgba(74,124,95,0.2)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography variant="label" style={{ color: '#4A7C5F', fontSize: 20 }}>O</Typography>
            </View>
            <Typography
              variant="title"
              style={{ fontSize: 22, textAlign: 'center' }}
            >
              What do you want to achieve?
            </Typography>
            <Typography variant="body" style={{ textAlign: 'center' }}>
              {'Describe your goal in plain words —\nI\'ll help you shape it.'}
            </Typography>
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
                  <Typography
                    variant="body"
                    style={{
                      color: msg.role === 'user' ? '#EDE7DA' : '#211F1A',
                      fontSize: 14,
                      lineHeight: 22,
                    }}
                  >
                    {msg.content}
                  </Typography>
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
                  <Typography variant="label">Saving your goal…</Typography>
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
                <Typography variant="body" style={{ color: '#C0483A', fontSize: 14 }}>{error}</Typography>
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
              color: '#211F1A',
              fontSize: 14,
              maxHeight: 120,
              padding: 0,
            }}
            placeholder="Tell me about your goal..."
            placeholderTextColor="#A79E8E"
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
              <Typography variant="meta" style={{ color: '#FFFFFF', fontSize: 16, lineHeight: 18 }}>↑</Typography>
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
              onPress={() => {}}
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
              <Typography variant="label" style={{ color: '#4A7C5F', fontSize: 12 }}>{label}</Typography>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {showIntro && projects.length > 0 && (
          <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
            <Typography variant="label" style={{ marginBottom: 8 }}>
              Link to a project (optional)
            </Typography>
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
                      backgroundColor: isSelected ? '#1E3226' : '#FFFFFF',
                      borderWidth: isSelected ? 0 : 1,
                      borderColor: '#EAE7E0',
                      borderRadius: 999,
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                    }}
                    activeOpacity={0.7}
                  >
                    <Typography
                      variant="label"
                      style={{ color: isSelected ? '#EDE7DA' : '#8A8172' }}
                    >
                      {project.title}
                    </Typography>
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
