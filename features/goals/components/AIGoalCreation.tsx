import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { ChatMessageList, type ChatMessage } from '@/components/ui/ChatMessageList';
import { Typography } from '@/components/ui/Typography';
import { GoalReviewScreen } from './GoalReviewScreen';
import { GoalTemplateCards } from './GoalTemplateCards';
import { getCategoryAccentTheme } from '@/constants/themes';
import type { GoalTemplateResponse } from '@/lib/ai/schemas/goal-creation';
import { authedFetch, UnauthorizedError } from '@/lib/api/client';
import type { ApiResponse } from '@/lib/api/contracts';
import type { CreateGoalWithMilestonesAndTrackersResult } from '@/lib/db/goals';
import { fetchGoalById } from '@/features/goals/services/goal-service';
import { useGoalStore } from '@/features/goals/store';
import { useThemeColors } from '@/store/uiStore';

const INITIAL_GREETING =
  "What's on your mind? Tell me about something you want to achieve.";

type ChatPhase = 'chatting' | 'selecting' | 'reviewing' | 'success';

type ChatResponseBody =
  | { type: 'message'; content: string }
  | { type: 'templates'; transition_message: string; templates: GoalTemplateResponse }
  | { type: 'error'; error: string };

let aiLocalId = 0;
function localId(prefix: string): string {
  aiLocalId += 1;
  return `${prefix}-${Date.now()}-${aiLocalId}`;
}

export interface AIGoalCreationProps {
  /** Lets the container offer a fallback to the manual wizard (e.g. on quota). */
  onSwitchToManual?: () => void;
}

export function AIGoalCreation({ onSwitchToManual }: AIGoalCreationProps) {
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const compact = width < 720;
  const upsertGoal = useGoalStore((current) => current.upsertGoal);

  const [phase, setPhase] = useState<ChatPhase>('chatting');
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    { id: 'greeting', role: 'assistant', content: INITIAL_GREETING, timestamp: Date.now() },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [quotaReached, setQuotaReached] = useState(false);
  const [templateResponse, setTemplateResponse] = useState<GoalTemplateResponse | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdGoalId, setCreatedGoalId] = useState<string | null>(null);

  const accent = templateResponse
    ? getCategoryAccentTheme(templateResponse.derived_category)
    : null;
  const accentColor = accent?.color ?? colors.accent.primary;
  const selectedTemplate =
    templateResponse != null && selectedIndex != null
      ? templateResponse.templates[selectedIndex]
      : null;

  async function sendMessage() {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = {
      id: localId('user'),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setIsLoading(true);
    setErrorText(null);

    try {
      const response = await authedFetch('/api/goals/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
        }),
      });

      const body = (await response.json()) as ChatResponseBody;

      if (response.status === 429) {
        setQuotaReached(true);
        setErrorText(
          body.type === 'error'
            ? body.error
            : 'Daily AI limit reached. Try again tomorrow or create your goal manually.',
        );
        return;
      }

      if (body.type === 'message') {
        setMessages((current) => [
          ...current,
          {
            id: localId('assistant'),
            role: 'assistant',
            content: body.content,
            timestamp: Date.now(),
          },
        ]);
      } else if (body.type === 'templates') {
        setMessages((current) => [
          ...current,
          {
            id: localId('assistant'),
            role: 'assistant',
            content: body.transition_message,
            timestamp: Date.now(),
          },
        ]);
        setTemplateResponse(body.templates);
        setSelectedIndex(null);
        setPhase('selecting');
      } else {
        setErrorText(body.error || 'Something went wrong. Please try again.');
      }
    } catch (error) {
      if (error instanceof UnauthorizedError) return;
      setErrorText('Could not reach Ohara. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  async function submitGoal(
    payload: Parameters<React.ComponentProps<typeof GoalReviewScreen>['onSubmit']>[0],
  ) {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const response = await authedFetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as ApiResponse<CreateGoalWithMilestonesAndTrackersResult>;
      if (!body.ok) throw new Error(body.error.message || 'Could not create the goal.');
      if (!body.data.goalId) throw new Error(body.data.error || 'Could not create the goal.');

      const savedGoal = await fetchGoalById(body.data.goalId);
      if (savedGoal) upsertGoal(savedGoal);
      setCreatedGoalId(body.data.goalId);
      setPhase('success');
    } catch (error) {
      if (error instanceof UnauthorizedError) return;
      setSubmitError(error instanceof Error ? error.message : 'Could not create the goal.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function resetFlow() {
    setPhase('chatting');
    setMessages([
      { id: 'greeting', role: 'assistant', content: INITIAL_GREETING, timestamp: Date.now() },
    ]);
    setInput('');
    setIsLoading(false);
    setErrorText(null);
    setQuotaReached(false);
    setTemplateResponse(null);
    setSelectedIndex(null);
    setIsSubmitting(false);
    setSubmitError(null);
    setCreatedGoalId(null);
  }

  const horizontalPadding = compact ? 16 : 32;

  function renderErrorBanner() {
    if (!errorText) return null;
    return (
      <View style={{ gap: 8, marginBottom: 10 }}>
        <Typography
          accessibilityRole="alert"
          variant="caption"
          style={{ color: colors.feedback.danger.text }}
        >
          {errorText}
        </Typography>
        {quotaReached && onSwitchToManual ? (
          <Button onPress={onSwitchToManual} size="compact" variant="secondary">
            Build it myself instead
          </Button>
        ) : null}
      </View>
    );
  }

  function renderChatting() {
    return (
      <View style={{ flex: 1, paddingHorizontal: horizontalPadding, paddingTop: 12 }}>
        <View style={{ alignSelf: 'center', flex: 1, maxWidth: 760, width: '100%' }}>
          <ChatMessageList messages={messages} isLoading={isLoading} />
          {renderErrorBanner()}
          <View
            style={{
              alignItems: 'flex-end',
              flexDirection: 'row',
              gap: 8,
              paddingTop: 8,
            }}
          >
            <TextInput
              accessibilityLabel="Message Ohara"
              editable={!isLoading}
              multiline
              onChangeText={setInput}
              onSubmitEditing={() => void sendMessage()}
              placeholder="Type your reply…"
              placeholderTextColor={colors.text.muted}
              style={{
                backgroundColor: colors.background.input,
                borderColor: colors.border.warm,
                borderRadius: 22,
                borderWidth: 1,
                color: colors.text.primary,
                flex: 1,
                fontFamily: 'Inter-Regular',
                fontSize: 15,
                maxHeight: 120,
                outlineWidth: 0,
                paddingHorizontal: 16,
                paddingVertical: 11,
              }}
              value={input}
            />
            <Pressable
              accessibilityLabel="Send message"
              accessibilityRole="button"
              disabled={!input.trim() || isLoading}
              onPress={() => void sendMessage()}
              style={({ pressed }) => ({
                alignItems: 'center',
                backgroundColor: accentColor,
                borderRadius: 22,
                height: 44,
                justifyContent: 'center',
                opacity: !input.trim() || isLoading ? 0.45 : pressed ? 0.78 : 1,
                width: 44,
              })}
            >
              <Typography variant="body" style={{ color: colors.text.onAccent, fontSize: 18 }}>
                ↑
              </Typography>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  function renderSelecting() {
    if (!templateResponse) return null;
    return (
      <View style={{ flex: 1, paddingHorizontal: horizontalPadding, paddingTop: 12 }}>
        <View style={{ alignSelf: 'center', flex: 1, maxWidth: 760, width: '100%' }}>
          <View
            style={{
              borderBottomColor: colors.border.warm,
              borderBottomWidth: 1,
              maxHeight: 220,
              paddingBottom: 8,
            }}
          >
            <ChatMessageList messages={messages} />
          </View>
          <ScrollView
            contentContainerStyle={{ gap: 16, paddingBottom: 24, paddingTop: 16 }}
            style={{ flex: 1 }}
          >
            <View>
              <Typography variant="title" style={{ fontFamily: 'Lora-SemiBold', fontSize: 19 }}>
                Three ways to approach this.
              </Typography>
              <Typography variant="caption" style={{ color: colors.text.secondary, marginTop: 4 }}>
                Pick the one that fits. You can edit everything on the next screen.
              </Typography>
            </View>
            <GoalTemplateCards
              templates={templateResponse.templates}
              derived_category={templateResponse.derived_category}
              onSelect={(index) => {
                setSelectedIndex(index);
                setSubmitError(null);
                setPhase('reviewing');
              }}
            />
            <View style={{ alignItems: 'flex-start' }}>
              <Button onPress={() => setPhase('chatting')} variant="ghost">
                ← Back to chat
              </Button>
            </View>
          </ScrollView>
        </View>
      </View>
    );
  }

  function renderReviewing() {
    if (!selectedTemplate) return null;
    return (
      <View style={{ flex: 1, paddingHorizontal: horizontalPadding, paddingTop: 12 }}>
        <View style={{ alignSelf: 'center', flex: 1, maxWidth: 760, width: '100%' }}>
          {submitError ? (
            <Typography
              accessibilityRole="alert"
              variant="caption"
              style={{ color: colors.feedback.danger.text, marginBottom: 8, textAlign: 'center' }}
            >
              {submitError}
            </Typography>
          ) : null}
          <GoalReviewScreen
            template={selectedTemplate}
            onSubmit={submitGoal}
            onBack={() => {
              setSubmitError(null);
              setPhase('selecting');
            }}
            isSubmitting={isSubmitting}
          />
        </View>
      </View>
    );
  }

  function renderSuccess() {
    const goalTitle = selectedTemplate?.goal.title ?? 'Your goal';
    return (
      <ScrollView
        contentContainerStyle={{
          alignItems: 'center',
          paddingHorizontal: horizontalPadding,
          paddingTop: 40,
        }}
        style={{ flex: 1 }}
      >
        <View style={{ alignItems: 'center', maxWidth: 520, width: '100%' }}>
          <View
            style={{
              alignItems: 'center',
              backgroundColor: accent ? accent.tint : colors.accent.tealSubtle,
              borderColor: accentColor,
              borderRadius: 44,
              borderWidth: 2,
              height: 88,
              justifyContent: 'center',
              marginBottom: 24,
              width: 88,
            }}
          >
            <Typography variant="heading" style={{ color: accentColor, fontSize: 38 }}>
              ✓
            </Typography>
          </View>
          <Typography
            variant="heading"
            style={{ fontFamily: 'Lora-SemiBold', fontSize: 28, textAlign: 'center' }}
          >
            Goal created.
          </Typography>
          <Typography
            variant="body"
            style={{
              fontSize: 15,
              lineHeight: 23,
              marginBottom: 28,
              marginTop: 10,
              textAlign: 'center',
            }}
          >
            “{goalTitle}” is ready, with its milestones and trackers on the goal page.
          </Typography>
          <Button
            disabled={!createdGoalId}
            onPress={() =>
              createdGoalId && router.replace(`/(app)/goals/${createdGoalId}` as never)
            }
            style={{ width: '100%' }}
          >
            View goal
          </Button>
          <Button onPress={resetFlow} style={{ marginTop: 12 }} variant="ghost">
            ↺ Create another
          </Button>
        </View>
      </ScrollView>
    );
  }

  if (phase === 'selecting') return renderSelecting();
  if (phase === 'reviewing') return renderReviewing();
  if (phase === 'success') return renderSuccess();
  return renderChatting();
}

export default AIGoalCreation;
