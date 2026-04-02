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
import { router } from 'expo-router';
// CHANGE 1: Import LinearGradient for full-screen background gradient
import { LinearGradient } from 'expo-linear-gradient';
import supabase from '@/lib/db/client';
import { createGoalWithMeasurables } from '@/lib/db/goals';
import { fetchGoalById } from '@/features/goals/services/goal-service';
import { useGoalStore } from '@/features/goals/store';
import type { GoalFinalizeResponse } from '@/lib/ai/schemas/goal-creation';

type ConversationMessage = { role: 'user' | 'assistant'; content: string };

export default function GoalCreateScreen() {
  const { upsertGoal } = useGoalStore();
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [savingGoal, setSavingGoal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  async function submitGoalChat(options?: { finalize?: boolean }) {
    const finalize = options?.finalize === true;
    const text = input.trim();
    if (isLoading || savingGoal) return;
    if (!finalize && !text) return;
    if (finalize && !text && messages.length === 0) return;

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

          router.replace(`/goals/${saveResult.goalId}`);
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

  // CHANGE 2: Intro state — shown when no messages and input is empty
  const showIntro = messages.length === 0 && input.trim().length === 0;

  return (
    // CHANGE 1: SafeAreaView is now transparent; LinearGradient provides the background
    <SafeAreaView style={{ flex: 1, backgroundColor: '#050A06' }}>
      <LinearGradient
        colors={['#0D1A0F', '#0A110C', '#080D09', '#050A06']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ flex: 1 }}
      >
        {/* CHANGE 6: Nav bar — transparent background, no hard bottom border */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 10,
          }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 12 }}
            activeOpacity={0.7}
          >
            <Text style={{ color: '#556655', fontSize: 18 }}>←</Text>
            <Text style={{ color: '#556655', fontSize: 14 }}>Goals</Text>
          </TouchableOpacity>
          <View style={{ width: 1, height: 16, backgroundColor: '#1E3020', marginRight: 12 }} />
          <Text style={{ color: '#FAFAFA', fontWeight: '600', fontSize: 15 }}>New goal</Text>
          <View style={{ flex: 1 }} />
          {/* CHANGE 6: "Create goal" button — dark green with teal text */}
          <TouchableOpacity
            onPress={handleCreateGoal}
            disabled={(messages.length === 0 && !input.trim()) || isLoading || savingGoal}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 999,
              backgroundColor: '#1A3020',
              borderWidth: 1,
              borderColor:
                (messages.length > 0 || input.trim()) && !isLoading && !savingGoal
                  ? '#2A5030'
                  : '#1E3020',
              opacity:
                (messages.length > 0 || input.trim()) && !isLoading && !savingGoal ? 1 : 0.4,
            }}
            activeOpacity={0.7}
          >
            <Text style={{ color: '#6FDFB8', fontSize: 13, fontWeight: '600' }}>Create goal</Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          {/* CHANGE 2: Intro block — centered logo mark + heading + subtext */}
          {showIntro ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 16 }}>
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: '#1A3020',
                  borderWidth: 1,
                  borderColor: '#2A4830',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#6FDFB8', fontSize: 20, fontWeight: '500' }}>O</Text>
              </View>
              <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '500', textAlign: 'center' }}>
                What do you want to achieve?
              </Text>
              <Text style={{ color: '#556655', fontSize: 14, textAlign: 'center', lineHeight: 22 }}>
                {'Describe your goal in plain words —\nI\'ll help you shape it.'}
              </Text>
            </View>
          ) : (
            /* CHANGE 3: Chat history — styled message bubbles */
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
                    // User messages right-aligned; assistant left-aligned
                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  {/* CHANGE 3: Ohara messages — teal dot prefix, no bubble */}
                  {msg.role === 'assistant' && (
                    <View
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: '#6FDFB8',
                        marginTop: 6,
                        marginRight: 8,
                        flexShrink: 0,
                      }}
                    />
                  )}
                  {/* CHANGE 3: User messages — dark green bubble */}
                  <View
                    style={
                      msg.role === 'user'
                        ? {
                            backgroundColor: '#1A2E1E',
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
                        color: msg.role === 'user' ? '#FFFFFF' : '#C8D8C8',
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
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12, gap: 8 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#6FDFB8' }} />
                  <ActivityIndicator color="#6FDFB8" size="small" />
                  {savingGoal && (
                    <Text style={{ color: '#556655', fontSize: 13 }}>Saving your goal…</Text>
                  )}
                </View>
              )}

              {error && (
                <View
                  style={{
                    marginHorizontal: 16,
                    backgroundColor: '#2D1B1B',
                    borderRadius: 8,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: '#5C2020',
                    marginBottom: 8,
                  }}
                >
                  <Text style={{ color: '#FF6B6B', fontSize: 14 }}>{error}</Text>
                </View>
              )}
            </ScrollView>
          )}

          {/* CHANGE 4: Input area — frosted dark-green container */}
          <View
            style={{
              backgroundColor: '#0E1A10',
              borderWidth: 1,
              borderColor: '#1E3020',
              borderRadius: 16,
              marginHorizontal: 16,
              marginBottom: 8,
              paddingHorizontal: 16,
              paddingVertical: 12,
              flexDirection: 'row',
              alignItems: 'flex-end',
              gap: 8,
            }}
          >
            <TextInput
              style={{
                flex: 1,
                backgroundColor: 'transparent',
                color: '#FFFFFF',
                fontSize: 14,
                maxHeight: 120,
                padding: 0,
              }}
              placeholder="Tell me about your goal..."
              placeholderTextColor="#445544"
              value={input}
              onChangeText={setInput}
              multiline
              onSubmitEditing={handleSend}
              editable={!isLoading && !savingGoal}
            />
            {/* CHANGE 4: Send button — teal circle, only shown when input has content */}
            {input.trim().length > 0 && (
              <TouchableOpacity
                onPress={handleSend}
                disabled={isLoading || savingGoal}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: '#6FDFB8',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
                activeOpacity={0.7}
              >
                <Text style={{ color: '#0A0A0F', fontSize: 16, lineHeight: 18 }}>↑</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* CHANGE 5: Mode selector pills — placeholder only, not wired */}
          {/* TODO: wire mode selection in Phase 2 */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12, gap: 8 }}
            style={{ flexShrink: 0 }}
          >
            {(['⚡ Quick', '◎ Deep', '✦ Reflect', '❋ Holistic'] as const).map((label) => (
              <TouchableOpacity
                key={label}
                onPress={() => console.log('TODO: wire mode selection in Phase 2', label)}
                style={{
                  backgroundColor: '#0E1A10',
                  borderWidth: 1,
                  borderColor: '#1E3020',
                  borderRadius: 999,
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                }}
                activeOpacity={0.7}
              >
                <Text style={{ color: '#6FDFB8', fontSize: 12, fontWeight: '500' }}>{label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}
