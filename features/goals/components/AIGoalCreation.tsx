import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { Button } from '@/components/ui/Button';
import {
  FocusedChatMessageList,
  type ChatMessage,
} from '@/components/ui/FocusedChatMessageList';
import { Typography } from '@/components/ui/Typography';
import { EchoGoalDraftCards } from './EchoGoalDraftCards';
import { GoalReviewScreen } from './GoalReviewScreen';
import { GoalTemplateCards } from './GoalTemplateCards';
import { getCategoryAccentTheme } from '@/constants/themes';
import type { GoalTemplateOption, GoalTemplateResponse } from '@/lib/ai/schemas/goal-creation';
import { authedFetch, UnauthorizedError } from '@/lib/api/client';
import type { ApiResponse } from '@/lib/api/contracts';
import type { CreateGoalWithMilestonesAndTrackersResult } from '@/lib/db/goals';
import { DASHBOARD_DRAFT_SAVED_ROUTE } from '@/lib/navigation/dashboard';
import { fetchGoalById } from '@/features/goals/services/goal-service';
import { useGoalStore } from '@/features/goals/store';
import { useThemeColors } from '@/store/uiStore';

const INITIAL_GREETING =
  "What's on your mind? Tell me about something you want to achieve.";

type ChatPhase = 'entry' | 'chatting' | 'selecting' | 'reviewing' | 'success';

const ENTRY_SUGGESTIONS = [
  'I want to get back into running.',
  'I want to feel more present with my family.',
  'I want to make real progress on my side project.',
];

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

  const [phase, setPhase] = useState<ChatPhase>('entry');
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

  /**
   * The response still contains the complete three-template set. The focused
   * conversation presents a useful pair first: a measurable cadence when one
   * exists, plus a narrative alternative. Every fallback is deliberately
   * distinct so a user never sees the same draft in both cards.
   */
  function resolveFocusedDraftPair():
    | { concrete: GoalTemplateOption; open: GoalTemplateOption; openIsNarrative: boolean }
    | null {
    if (!templateResponse || templateResponse.templates.length < 2) return null;

    const templates = templateResponse.templates;
    const concreteIndex = templates.findIndex((template) => template.target_frequency !== null);
    const firstIndex = concreteIndex >= 0 ? concreteIndex : 0;
    const openIndex = templates.findIndex(
      (template, index) => index !== firstIndex && template.target_frequency === null,
    );
    const secondIndex = openIndex >= 0
      ? openIndex
      : templates.findIndex((_template, index) => index !== firstIndex);

    return {
      concrete: templates[firstIndex],
      open: templates[secondIndex],
      openIsNarrative: templates[secondIndex].target_frequency === null,
    };
  }

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
          // The greeting is a local UI affordance, not an LLM response. Do not
          // send it: Anthropic conversations must begin with a user message.
          messages: nextMessages.filter((message) => message.id !== 'greeting').map((message) => ({
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
        // Keep the curated pair in the conversation. The full list remains
        // available through the secondary fallback beneath the cards.
        setPhase('chatting');
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
    status: 'active' | 'draft' = 'active',
  ) {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const response = await authedFetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, status }),
      });
      const body = (await response.json()) as ApiResponse<CreateGoalWithMilestonesAndTrackersResult>;
      if (!body.ok) throw new Error(body.error.message || 'Could not create the goal.');
      if (!body.data.goalId) throw new Error(body.data.error || 'Could not create the goal.');

      if (status === 'draft') {
        router.replace(DASHBOARD_DRAFT_SAVED_ROUTE as never);
        return;
      }

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
    setPhase('entry');
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
    const focusedPair = resolveFocusedDraftPair();
    return (
      <View style={{ flex: 1 }}>
        <View
          style={{
            alignItems: 'center',
            borderBottomColor: colors.border.divider,
            borderBottomWidth: 1,
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingHorizontal: horizontalPadding,
            paddingVertical: 12,
          }}
        >
          <Typography variant="caption" style={{ color: colors.text.muted }}>
            GOALS / CHAT WITH ECHO
          </Typography>
          {onSwitchToManual ? (
            <Pressable
              accessibilityLabel="Build a goal myself"
              accessibilityRole="button"
              onPress={onSwitchToManual}
              style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1, padding: 4 })}
            >
              <Typography variant="caption" style={{ color: colors.text.secondary }}>
                Build it myself
              </Typography>
            </Pressable>
          ) : null}
        </View>
        <View style={{ alignSelf: 'center', flex: 1, maxWidth: 760, width: '100%' }}>
          <FocusedChatMessageList
            isLoading={isLoading}
            messages={messages}
            trailingSlot={
              focusedPair ? (
                <EchoGoalDraftCards
                  concrete={focusedPair.concrete}
                  onSeeAll={() => setPhase('selecting')}
                  onSelect={(
                    _choice: 'concrete' | 'open',
                    template: GoalTemplateOption,
                  ) => {
                    const index = templateResponse?.templates.indexOf(template) ?? -1;
                    if (index < 0) return;
                    setSelectedIndex(index);
                    setSubmitError(null);
                    setPhase('reviewing');
                  }}
                  open={focusedPair.open}
                  openIsNarrative={focusedPair.openIsNarrative}
                  totalCount={templateResponse?.templates.length}
                />
              ) : null
            }
          />
          {renderErrorBanner()}
          <View
            style={{
              alignItems: 'flex-end',
              borderTopColor: colors.border.divider,
              borderTopWidth: 1,
              flexDirection: 'row',
              gap: 8,
              paddingHorizontal: horizontalPadding,
              paddingVertical: 12,
            }}
          >
            <TextInput
              accessibilityLabel="Message Ohara"
              editable={!isLoading}
              multiline
              onChangeText={setInput}
              onSubmitEditing={() => void sendMessage()}
              placeholder="Reply to Echo…"
              placeholderTextColor={colors.text.muted}
              style={{
                backgroundColor: colors.background.input,
                borderColor: colors.border.input,
                borderRadius: 12,
                borderWidth: 1,
                color: colors.text.primary,
                flex: 1,
                fontFamily: 'Inter',
                fontSize: 15,
                maxHeight: 120,
                outlineWidth: 0,
                paddingHorizontal: 14,
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
                borderRadius: 10,
                height: 42,
                justifyContent: 'center',
                opacity: !input.trim() || isLoading ? 0.45 : pressed ? 0.78 : 1,
                width: 42,
              })}
            >
              <Typography variant="body" style={{ color: colors.text.onAccent, fontSize: 15 }}>
                ↵
              </Typography>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  function renderEntry() {
    return (
      <ScrollView
        contentContainerStyle={{
          alignItems: 'center',
          flexGrow: 1,
          justifyContent: 'center',
          paddingHorizontal: horizontalPadding,
          paddingVertical: compact ? 28 : 48,
        }}
        keyboardShouldPersistTaps="handled"
        style={{ flex: 1 }}
      >
        <View style={{ alignItems: 'center', maxWidth: 640, width: '100%' }}>
          <Typography
            variant="heading"
            style={{
              color: colors.text.primary,
              fontFamily: 'Lora-SemiBold',
              fontSize: compact ? 38 : 52,
              letterSpacing: compact ? -0.6 : -0.9,
              lineHeight: compact ? 42 : 55,
              textAlign: 'center',
            }}
          >
            What do you want{`\n`}to work on?
          </Typography>
          <Typography
            variant="body"
            style={{
              color: colors.text.secondary,
              fontSize: 15.5,
              lineHeight: 23,
              marginTop: compact ? 20 : 28,
              maxWidth: 460,
              textAlign: 'center',
            }}
          >
            Tell Echo what has been on your mind. It will help you turn the feeling into a goal
            that fits your life.
          </Typography>

          <View
            style={{
              backgroundColor: colors.background.card,
              borderColor: colors.border.input,
              borderRadius: 16,
              borderWidth: 1,
              marginTop: compact ? 30 : 38,
              padding: 12,
              width: '100%',
            }}
          >
            <TextInput
              accessibilityLabel="Tell Echo what you want to work on"
              multiline
              onChangeText={setInput}
              onSubmitEditing={() => {
                setPhase('chatting');
                void sendMessage();
              }}
              placeholder="I want to get back into running—"
              placeholderTextColor={colors.text.muted}
              style={{
                color: colors.text.primary,
                fontFamily: 'Lora-Regular',
                fontSize: compact ? 19 : 22,
                lineHeight: compact ? 27 : 30,
                minHeight: 56,
                outlineWidth: 0,
                paddingHorizontal: 4,
                paddingTop: 6,
                textAlignVertical: 'top',
              }}
              value={input}
            />
            <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }}>
              <Typography variant="caption" style={{ color: colors.text.muted, fontSize: 11.5 }}>
                Press Enter to send
              </Typography>
              <Button
                disabled={!input.trim() || isLoading}
                onPress={() => {
                  setPhase('chatting');
                  void sendMessage();
                }}
                size="compact"
              >
                Send →
              </Button>
            </View>
          </View>

          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 8,
              justifyContent: 'center',
              marginTop: 14,
            }}
          >
            {ENTRY_SUGGESTIONS.map((suggestion) => (
              <Pressable
                accessibilityRole="button"
                key={suggestion}
                onPress={() => setInput(suggestion)}
                style={({ pressed }) => ({
                  backgroundColor: colors.background.input,
                  borderColor: colors.border.warm,
                  borderRadius: 999,
                  borderWidth: 1,
                  opacity: pressed ? 0.72 : 1,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                })}
              >
                <Typography variant="caption" style={{ color: colors.text.secondary }}>
                  {suggestion}
                </Typography>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
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
            <FocusedChatMessageList messages={messages} />
          </View>
          <ScrollView
            contentContainerStyle={{ gap: 16, paddingBottom: 24, paddingTop: 16 }}
            style={{ flex: 1 }}
          >
            <GoalTemplateCards
              templates={templateResponse.templates}
              derived_category={templateResponse.derived_category}
              onSelect={(index) => {
                setSelectedIndex(index);
                setSubmitError(null);
                setPhase('reviewing');
              }}
              onBackToChat={() => setPhase('chatting')}
            />
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
            onSaveDraft={(payload) => submitGoal(payload, 'draft')}
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
          backgroundColor: colors.background.page,
          flexGrow: 1,
          justifyContent: 'center',
          paddingHorizontal: horizontalPadding,
          paddingTop: 40,
        }}
        style={{ flex: 1 }}
      >
        <View
          style={{
            alignItems: 'center',
            backgroundColor: accent ? accent.tint : colors.accent.tealSubtle,
            borderRadius: 260,
            maxWidth: 600,
            paddingHorizontal: compact ? 18 : 46,
            paddingVertical: compact ? 42 : 64,
            width: '100%',
          }}
        >
          <View
            style={{
              alignItems: 'center',
              backgroundColor: colors.background.card,
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
            style={{
              fontFamily: 'Lora-SemiBold',
              fontSize: compact ? 34 : 44,
              letterSpacing: -0.7,
              lineHeight: compact ? 39 : 48,
              textAlign: 'center',
            }}
          >
            You’re on the clock.
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

  if (phase === 'entry') return renderEntry();
  if (phase === 'selecting') return renderSelecting();
  if (phase === 'reviewing') return renderReviewing();
  if (phase === 'success') return renderSuccess();
  return renderChatting();
}

export default AIGoalCreation;
