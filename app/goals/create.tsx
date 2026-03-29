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
import { createGoalWithMeasurables, type AiGoalData } from '@/lib/db/goals';
import type { GoalData } from '@/app/api/goals/create+api';

type ConversationMessage = { role: 'user' | 'assistant'; content: string };

export default function GoalCreateScreen() {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [savingGoal, setSavingGoal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || isLoading) return;

    setInput('');
    setError(null);

    const updatedMessages: ConversationMessage[] = [
      ...messages,
      { role: 'user', content: text },
    ];
    setMessages(updatedMessages);
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
          userMessage: text,
          conversationHistory: messages,
          userId: user.id,
        }),
      });

      if (!response.ok) {
        const errData = (await response.json()) as { error?: string };
        throw new Error(errData.error ?? `Request failed: ${response.status}`);
      }

      const data = (await response.json()) as {
        message: string;
        isComplete: boolean;
        goalData?: GoalData;
      };

      setMessages([...updatedMessages, { role: 'assistant', content: data.message }]);

      if (data.isComplete && data.goalData) {
        setSavingGoal(true);
        const goalId = await createGoalWithMeasurables(user.id, data.goalData as AiGoalData);
        setSavingGoal(false);

        if (goalId) {
          router.replace(`/goals/${goalId}`);
        } else {
          setError('Goal created by AI but failed to save. Please try again.');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
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
