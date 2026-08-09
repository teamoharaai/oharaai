import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, TextInput, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { FocusedChatMessageList, type ChatMessage } from '@/components/ui/FocusedChatMessageList';
import { Modal } from '@/components/ui/Modal';
import { Typography } from '@/components/ui/Typography';
import { useThemeColors } from '@/store/uiStore';
import { useEntriesStore } from '../store';
import type { ReflectionTurn, ReflectionType } from '../types';

const PROMPTS: Record<ReflectionType, string[]> = {
  week: [
    'What stands out when you look back on this week?',
    'Why did that feel important to you?',
    'What did you learn about what supports—or interrupts—your rhythm?',
    'Is there anything you want to carry forward or adjust?',
  ],
  goal: [
    'What has felt most alive or difficult in this goal recently?',
    'What do you think is influencing that?',
    'What have you learned about the way you want to approach this goal?',
    'Would a next step, a pause, or an adjustment feel most useful?',
  ],
  milestone: [
    'What does this milestone represent for you?',
    'What helped you reach—or move toward—it?',
    'What did this part of the journey teach you?',
    'How would you like to acknowledge or build from it?',
  ],
  open: [
    'What has been taking up space in your mind?',
    'Why does it feel meaningful right now?',
    'What are you noticing beneath the surface?',
    'Is there anything you want to remember or return to?',
  ],
};

const TYPE_LABELS: Record<ReflectionType, string> = {
  week: 'My week',
  goal: 'A goal',
  milestone: 'A milestone',
  open: 'Something on my mind',
};

let reflectionMessageId = 0;
function messageId(prefix: string): string {
  reflectionMessageId += 1;
  return `${prefix}-${Date.now()}-${reflectionMessageId}`;
}

export function GuidedReflection({
  initialType,
  initialGoalId,
}: {
  initialType: ReflectionType;
  initialGoalId?: string;
}) {
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const compact = width < 720;
  const goals = useEntriesStore((state) => state.goals);
  const loadContext = useEntriesStore((state) => state.loadContext);
  const createEntry = useEntriesStore((state) => state.createEntry);
  const [type] = useState(initialType);
  const [goalId, setGoalId] = useState(initialGoalId ?? '');
  const [milestoneId, setMilestoneId] = useState('');
  const [promptIndex, setPromptIndex] = useState(0);
  const [input, setInput] = useState('');
  const [turns, setTurns] = useState<ReflectionTurn[]>(() => [{
    id: messageId('ohara'),
    role: 'ohara',
    content: PROMPTS[type][0],
    createdAt: new Date().toISOString(),
  }]);
  const [endOpen, setEndOpen] = useState(false);
  const [takeaway, setTakeaway] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (goals.length === 0) void loadContext();
  }, [goals.length, loadContext]);

  const selectedGoal = goals.find((goal) => goal.id === goalId) ?? null;
  const messages = useMemo<ChatMessage[]>(() => turns.map((turn) => ({
    id: turn.id,
    role: turn.role === 'ohara' ? 'assistant' : 'user',
    content: turn.content,
    timestamp: new Date(turn.createdAt).getTime(),
  })), [turns]);

  function send() {
    const response = input.trim();
    if (!response) return;
    const userTurn: ReflectionTurn = {
      id: messageId('user'),
      role: 'user',
      content: response,
      createdAt: new Date().toISOString(),
    };
    const nextPromptIndex = promptIndex + 1;
    const nextTurns = [...turns, userTurn];
    if (nextPromptIndex < PROMPTS[type].length) {
      nextTurns.push({
        id: messageId('ohara'),
        role: 'ohara',
        content: PROMPTS[type][nextPromptIndex],
        createdAt: new Date().toISOString(),
      });
      setPromptIndex(nextPromptIndex);
    }
    setTurns(nextTurns);
    setInput('');
  }

  async function complete() {
    const userResponses = turns.filter((turn) => turn.role === 'user');
    if (!userResponses.length) {
      setError('Write at least one response before completing your reflection.');
      setEndOpen(false);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const date = new Date();
      const title = selectedGoal
        ? `${selectedGoal.title} reflection`
        : `${TYPE_LABELS[type]} · ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      const plainText = userResponses.map((turn) => turn.content).join('\n\n');
      const entry = await createEntry({
        entryType: 'reflection',
        title,
        content: {
          type: 'doc',
          blocks: userResponses.map((turn) => ({
            id: `block-${turn.id}`,
            type: 'paragraph',
            text: turn.content,
          })),
        },
        plainText,
        reflectionType: type,
        conversationTurns: turns,
        takeaway: takeaway.trim() || null,
        completedAt: new Date().toISOString(),
        relationships: {
          goalIds: goalId ? [goalId] : [],
          categoryIds: [],
          milestoneIds: milestoneId ? [milestoneId] : [],
        },
      });
      router.replace(`/(app)/entries/${entry.id}` as never);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save reflection');
      setEndOpen(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={{ backgroundColor: colors.background.page, flex: 1, minHeight: 0 }}>
      <View
        style={{
          alignItems: 'center',
          borderBottomColor: colors.border.divider,
          borderBottomWidth: 1,
          flexDirection: 'row',
          gap: 12,
          minHeight: 62,
          paddingHorizontal: compact ? 14 : 24,
        }}
      >
        <Pressable
          accessibilityLabel="Back to Entries"
          onPress={() => router.replace('/(app)/entries' as never)}
        >
          <Ionicons name="arrow-back" color={colors.text.primary} size={22} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Typography variant="nav-title">{TYPE_LABELS[type]}</Typography>
          <Typography variant="caption">Guided prompts · no AI generation</Typography>
        </View>
        <Button onPress={() => setEndOpen(true)} size="compact" variant="secondary">
          End Reflection
        </Button>
      </View>

      <View
        style={{
          alignSelf: 'center',
          flex: 1,
          maxWidth: 820,
          minHeight: 0,
          width: '100%',
        }}
      >
        {(type === 'goal' || type === 'milestone') ? (
          <View
            style={{
              borderBottomColor: colors.border.divider,
              borderBottomWidth: 1,
              gap: 8,
              paddingHorizontal: compact ? 16 : 28,
              paddingVertical: 12,
            }}
          >
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ alignItems: 'center', flexDirection: 'row', gap: 7 }}>
                <Typography variant="caption">{type === 'milestone' ? 'Goal:' : 'Reflecting on:'}</Typography>
                {goals.filter((goal) => goal.status !== 'archived').map((goal) => (
                  <Pressable
                    key={goal.id}
                    onPress={() => { setGoalId(goal.id); setMilestoneId(''); }}
                    style={{
                      backgroundColor: goalId === goal.id ? colors.background.selectedRow : colors.background.input,
                      borderColor: goalId === goal.id ? colors.border.accent : colors.border.subtle,
                      borderRadius: 999,
                      borderWidth: 1,
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                    }}
                  >
                    <Typography variant="caption">{goal.title}</Typography>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
            {type === 'milestone' && selectedGoal ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ alignItems: 'center', flexDirection: 'row', gap: 7 }}>
                  <Typography variant="caption">Milestone:</Typography>
                  {selectedGoal.milestones.map((milestone) => (
                    <Pressable
                      key={milestone.id}
                      onPress={() => setMilestoneId(milestone.id)}
                      style={{
                        backgroundColor: milestoneId === milestone.id ? colors.background.selectedRow : colors.background.input,
                        borderRadius: 999,
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                      }}
                    >
                      <Typography variant="caption">{milestone.title}</Typography>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            ) : null}
          </View>
        ) : null}

        <FocusedChatMessageList messages={messages} isLoading={false} />

        {error ? (
          <Typography
            accessibilityRole="alert"
            variant="caption"
            style={{ color: colors.feedback.danger.text, paddingHorizontal: compact ? 16 : 28 }}
          >
            {error}
          </Typography>
        ) : null}

        <View
          style={{
            alignItems: 'flex-end',
            borderTopColor: colors.border.divider,
            borderTopWidth: 1,
            flexDirection: 'row',
            gap: 10,
            paddingHorizontal: compact ? 16 : 28,
            paddingVertical: 14,
          }}
        >
          <TextInput
            accessibilityLabel="Reflection response"
            multiline
            onChangeText={setInput}
            onSubmitEditing={send}
            placeholder="Write what feels true…"
            placeholderTextColor={colors.text.muted}
            style={{
              backgroundColor: colors.background.card,
              borderColor: colors.border.input,
              borderRadius: 14,
              borderWidth: 1,
              color: colors.text.primary,
              flex: 1,
              fontFamily: 'Inter-Regular',
              fontSize: 15,
              maxHeight: 140,
              minHeight: 48,
              outlineStyle: 'solid',
              outlineWidth: 0,
              paddingHorizontal: 14,
              paddingVertical: 12,
            }}
            value={input}
          />
          <Button disabled={!input.trim()} onPress={send} size="compact">
            Send
          </Button>
        </View>
      </View>

      <Modal
        visible={endOpen}
        onClose={() => setEndOpen(false)}
        closeDisabled={saving}
        showCloseButton={false}
        cancelText="Keep reflecting"
        onCancel={() => setEndOpen(false)}
        confirmText="Complete Reflection"
        onConfirm={() => void complete()}
        confirmDisabled={saving}
      >
        <Typography variant="title">Complete this reflection?</Typography>
        <Typography variant="body" style={{ marginTop: 7 }}>
          You can add an optional takeaway in your own words.
        </Typography>
        <TextInput
          accessibilityLabel="Optional reflection takeaway"
          editable={!saving}
          multiline
          onChangeText={setTakeaway}
          placeholder="What do you want to remember?"
          placeholderTextColor={colors.text.muted}
          style={{
            borderColor: colors.border.input,
            borderRadius: 12,
            borderWidth: 1,
            color: colors.text.primary,
            fontFamily: 'Inter-Regular',
            marginTop: 14,
            minHeight: 96,
            outlineStyle: 'solid',
            outlineWidth: 0,
            padding: 12,
            textAlignVertical: 'top',
          }}
          value={takeaway}
        />
      </Modal>
    </View>
  );
}
