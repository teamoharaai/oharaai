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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0A0A0F' }}>
      {/* Nav */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderBottomColor: '#1E1E2E',
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 12 }}
          activeOpacity={0.7}
        >
          <Text style={{ color: '#8888A0', fontSize: 18 }}>←</Text>
          <Text style={{ color: '#8888A0', fontSize: 14 }}>Goals</Text>
        </TouchableOpacity>
        <View style={{ width: 1, height: 16, backgroundColor: '#1E1E2E', marginRight: 12 }} />
        <Text style={{ color: '#FAFAFA', fontWeight: '600', fontSize: 15 }}>New goal</Text>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          onPress={handleCreateGoal}
          disabled={(messages.length === 0 && !input.trim()) || isLoading || savingGoal}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 999,
            backgroundColor:
              (messages.length > 0 || input.trim()) && !isLoading && !savingGoal ? '#1D6F5F' : '#1E1E2E',
          }}
          activeOpacity={0.7}
        >
          <Text style={{ color: '#FAFAFA', fontSize: 13, fontWeight: '600' }}>Create goal</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Message list */}
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 8, gap: 12 }}
        >
          {messages.length === 0 && (
            <View style={{ alignItems: 'center', marginTop: 48, gap: 8 }}>
              <Text style={{ color: '#FAFAFA', fontSize: 18, fontWeight: '600' }}>
                What do you want to achieve?
              </Text>
              <Text style={{ color: '#8888A0', fontSize: 14, textAlign: 'center', maxWidth: 280 }}>
                Describe your goal in plain words — I'll help you shape it.
              </Text>
            </View>
          )}

          {messages.map((msg, i) => (
            <View
              key={i}
              style={{
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '80%',
                backgroundColor: msg.role === 'user' ? '#6E5CE7' : '#14141F',
                borderRadius: 12,
                borderWidth: msg.role === 'assistant' ? 1 : 0,
                borderColor: '#1E1E2E',
                padding: 12,
              }}
            >
              <Text
                style={{
                  color: msg.role === 'user' ? '#FAFAFA' : '#D4D4E8',
                  fontSize: 15,
                  lineHeight: 22,
                }}
              >
                {msg.content}
              </Text>
            </View>
          ))}

          {(isLoading || savingGoal) && (
            <View style={{ alignSelf: 'flex-start', padding: 12 }}>
              <ActivityIndicator color="#6E5CE7" />
              {savingGoal && (
                <Text style={{ color: '#8888A0', fontSize: 13, marginTop: 6 }}>
                  Saving your goal…
                </Text>
              )}
            </View>
          )}

          {error && (
            <View
              style={{
                backgroundColor: '#2D1B1B',
                borderRadius: 8,
                padding: 12,
                borderWidth: 1,
                borderColor: '#5C2020',
              }}
            >
              <Text style={{ color: '#FF6B6B', fontSize: 14 }}>{error}</Text>
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            padding: 12,
            gap: 8,
            borderTopWidth: 1,
            borderTopColor: '#1E1E2E',
          }}
        >
          <TextInput
            style={{
              flex: 1,
              backgroundColor: '#14141F',
              borderRadius: 12,
              borderWidth: 1,
              borderColor: '#1E1E2E',
              color: '#FAFAFA',
              fontSize: 15,
              padding: 12,
              maxHeight: 120,
            }}
            placeholder="Tell me about your goal…"
            placeholderTextColor="#8888A0"
            value={input}
            onChangeText={setInput}
            multiline
            onSubmitEditing={handleSend}
            editable={!isLoading && !savingGoal}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!input.trim() || isLoading || savingGoal}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: input.trim() && !isLoading ? '#6E5CE7' : '#1E1E2E',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            activeOpacity={0.7}
          >
            <Text style={{ color: '#FAFAFA', fontSize: 18, lineHeight: 20 }}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
