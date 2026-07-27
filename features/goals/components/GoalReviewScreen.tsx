import { useMemo, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  DatePicker,
  formatCalendarDate,
  parseCalendarDate,
} from '@/components/ui/DatePicker';
import { Toggle } from '@/components/ui/Toggle';
import { Typography } from '@/components/ui/Typography';
import { getCategoryAccentTheme } from '@/constants/themes';
import type { GoalTemplateOption } from '@/lib/ai/schemas/goal-creation';
import type { ManualGoalCreationInput } from '@/lib/db/goals';
import {
  GOAL_TRACKER_FREQUENCIES,
  GOAL_TRACKER_TYPES,
  type GoalSmartData,
  type GoalTrackerFrequency,
  type GoalTrackerType,
} from '@/lib/goals/schema';
import { useThemeColors, useUIStore } from '@/store/uiStore';

export interface GoalReviewScreenProps {
  template: GoalTemplateOption;
  onSubmit: (
    payload: ManualGoalCreationInput & {
      smart_data: GoalSmartData;
      origin: 'ai_chatbot';
    },
  ) => Promise<void>;
  onSaveDraft: (
    payload: ManualGoalCreationInput & {
      smart_data: GoalSmartData;
      origin: 'ai_chatbot';
    },
  ) => Promise<void>;
  onBack: () => void;
  isSubmitting: boolean;
}

const DESCRIPTION_MAX = 280;

const TRACKER_TYPE_LABELS: Record<GoalTrackerType, string> = {
  habit: 'Habit',
  counter: 'Counter',
  checklist: 'Checklist',
};

const TRACKER_FREQUENCY_LABELS: Record<GoalTrackerFrequency, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
};

interface ReviewMilestone {
  id: string;
  title: string;
  description: string;
  dueDate: string;
}

interface ReviewTracker {
  id: string;
  title: string;
  type: GoalTrackerType;
  targetValue: string;
  targetUnit: string;
  frequency: GoalTrackerFrequency;
}

let reviewLocalId = 0;
function localId(prefix: string): string {
  reviewLocalId += 1;
  return `${prefix}-${Date.now()}-${reviewLocalId}`;
}

function toDateInput(value: string | null | undefined): string {
  if (!value) return '';
  const calendarDate = parseCalendarDate(value);
  if (calendarDate) return formatCalendarDate(calendarDate);
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return formatCalendarDate(parsed);
}

function tomorrowInput(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return toDateInput(tomorrow.toISOString());
}

function nextTrackerType(type: GoalTrackerType): GoalTrackerType {
  const index = GOAL_TRACKER_TYPES.indexOf(type);
  return GOAL_TRACKER_TYPES[(index + 1) % GOAL_TRACKER_TYPES.length];
}

function nextFrequency(frequency: GoalTrackerFrequency): GoalTrackerFrequency {
  const index = GOAL_TRACKER_FREQUENCIES.indexOf(frequency);
  return GOAL_TRACKER_FREQUENCIES[(index + 1) % GOAL_TRACKER_FREQUENCIES.length];
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function GoalReviewScreen({
  template,
  onSubmit,
  onSaveDraft,
  onBack,
  isSubmitting,
}: GoalReviewScreenProps) {
  const colors = useThemeColors();
  const darkMode = useUIStore((state) => state.themeMode) === 'dark';
  const accent = getCategoryAccentTheme(template.goal.category);

  const [title, setTitle] = useState(template.goal.title);
  const [description, setDescription] = useState(template.goal.description);
  const [deadline, setDeadline] = useState(toDateInput(template.goal.deadline));
  const [daysPerWeek, setDaysPerWeek] = useState(() => {
    const frequency = template.target_frequency;
    if (frequency && frequency.period === 'week') {
      return Math.max(1, Math.min(7, Math.round(frequency.times)));
    }
    return 3;
  });
  const [milestones, setMilestones] = useState<ReviewMilestone[]>(() =>
    template.milestones.map((milestone) => ({
      id: localId('milestone'),
      title: milestone.title,
      description: milestone.description ?? '',
      dueDate: toDateInput(milestone.dueDate),
    })),
  );
  const [trackers, setTrackers] = useState<ReviewTracker[]>(() =>
    template.trackers.map((tracker) => ({
      id: localId('tracker'),
      title: tracker.title,
      type: tracker.type,
      targetValue: tracker.targetValue != null ? String(tracker.targetValue) : '',
      targetUnit: tracker.targetUnit ?? '',
      frequency: tracker.frequency ?? 'weekly',
    })),
  );
  const [isPrivate, setIsPrivate] = useState(true);

  const deadlineValid = Boolean(deadline && deadline >= tomorrowInput());
  const trackersValid = trackers.every((tracker) => {
    if (!tracker.title.trim()) return false;
    if (tracker.type !== 'counter') return true;
    const target = Number(tracker.targetValue);
    return Number.isFinite(target) && target > 0 && Boolean(tracker.targetUnit.trim());
  });
  const canSubmit = useMemo(
    () => Boolean(title.trim()) && deadlineValid && trackersValid && !isSubmitting,
    [title, deadlineValid, trackersValid, isSubmitting],
  );

  function updateMilestone(id: string, updates: Partial<ReviewMilestone>) {
    setMilestones((current) =>
      current.map((milestone) => (milestone.id === id ? { ...milestone, ...updates } : milestone)),
    );
  }

  function removeMilestone(id: string) {
    setMilestones((current) => current.filter((milestone) => milestone.id !== id));
  }

  function moveMilestone(id: string, direction: -1 | 1) {
    setMilestones((current) => {
      const index = current.findIndex((milestone) => milestone.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function addMilestone() {
    setMilestones((current) => [
      ...current,
      { id: localId('milestone'), title: '', description: '', dueDate: '' },
    ]);
  }

  function updateTracker(id: string, updates: Partial<ReviewTracker>) {
    setTrackers((current) =>
      current.map((tracker) => (tracker.id === id ? { ...tracker, ...updates } : tracker)),
    );
  }

  function removeTracker(id: string) {
    setTrackers((current) => current.filter((tracker) => tracker.id !== id));
  }

  function cycleTrackerType(id: string) {
    setTrackers((current) =>
      current.map((tracker) => {
        if (tracker.id !== id) return tracker;
        const type = nextTrackerType(tracker.type);
        if (type === 'checklist') {
          return { ...tracker, type, targetValue: '', targetUnit: '' };
        }
        return {
          ...tracker,
          type,
          targetValue: tracker.targetValue || '1',
          targetUnit: tracker.targetUnit || 'times',
        };
      }),
    );
  }

  function addTracker() {
    setTrackers((current) => [
      ...current,
      {
        id: localId('tracker'),
        title: '',
        type: 'habit',
        targetValue: '',
        targetUnit: '',
        frequency: 'weekly',
      },
    ]);
  }

  function buildPayload(): ManualGoalCreationInput & {
    smart_data: GoalSmartData;
    origin: 'ai_chatbot';
  } {
    return {
      title: title.trim(),
      description: description.trim() || null,
      deadline,
      category: template.goal.category,
      visibility: isPrivate ? 'private' : 'circle',
      target_frequency: { period: 'week', times: daysPerWeek },
      project_id: null,
      smart_data: template.goal.smart,
      milestones: milestones
        .filter((milestone) => milestone.title.trim())
        .map((milestone) => ({
          title: milestone.title.trim(),
          description: milestone.description.trim() || null,
          dueDate: milestone.dueDate || null,
        })),
      trackers: trackers
        .filter((tracker) => tracker.title.trim())
        .map((tracker) => ({
          title: tracker.title.trim(),
          type: tracker.type,
          targetValue:
            tracker.type === 'checklist' ? null : Number(tracker.targetValue) || null,
          targetUnit: tracker.type === 'checklist' ? null : tracker.targetUnit.trim() || null,
          frequency: tracker.frequency,
        })),
      origin: 'ai_chatbot',
    };
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    await onSubmit(buildPayload());
  }

  async function handleSaveDraft() {
    if (!canSubmit) return;
    await onSaveDraft(buildPayload());
  }

  const inputStyle = {
    backgroundColor: colors.background.input,
    borderColor: colors.border.warm,
    borderRadius: 10,
    borderWidth: 1,
    color: colors.text.primary,
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    outlineWidth: 0,
    paddingHorizontal: 12,
    paddingVertical: 10,
  } as const;
  const reviewCardStyle = darkMode
    ? {
        backgroundColor: '#1A1A1A',
        borderColor: '#292929',
        shadowColor: '#000000',
        shadowOffset: { height: 2, width: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
      }
    : undefined;

  function AiSuggestedBadge() {
    return (
      <View
        style={{
          backgroundColor: darkMode ? colors.background.input : accent.tint,
          borderRadius: 999,
          paddingHorizontal: 8,
          paddingVertical: 3,
        }}
      >
        <Typography variant="badge-text" style={{ color: accent.mid }}>
          ✦ AI suggested
        </Typography>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ gap: 14, paddingBottom: 28, paddingTop: 4 }}
        keyboardShouldPersistTaps="handled"
        style={{ flex: 1 }}
      >
        {/* Section 1 — Goal identity */}
        <Card elevated padding="spacious" style={[{ gap: 14 }, reviewCardStyle]}>
          <Typography variant="eyebrow">GOAL</Typography>
          <View>
            <Typography variant="field-label" style={{ marginBottom: 6 }}>
              Title
            </Typography>
            <TextInput
              accessibilityLabel="Goal title"
              onChangeText={setTitle}
              placeholder="What do you want to achieve?"
              placeholderTextColor={colors.text.muted}
              style={inputStyle}
              value={title}
            />
          </View>
          <View>
            <Typography variant="field-label" style={{ marginBottom: 6 }}>
              Description
            </Typography>
            <TextInput
              accessibilityLabel="Goal description"
              multiline
              onChangeText={(value) => setDescription(value.slice(0, DESCRIPTION_MAX))}
              placeholder="A one-line summary of this goal."
              placeholderTextColor={colors.text.muted}
              style={{ ...inputStyle, minHeight: 66, textAlignVertical: 'top' }}
              value={description}
            />
            <Typography
              variant="caption"
              style={{ color: colors.text.muted, marginTop: 4, textAlign: 'right' }}
            >
              {description.length} / {DESCRIPTION_MAX}
            </Typography>
          </View>
          <View>
            <Typography variant="field-label" style={{ marginBottom: 6 }}>
              Category
            </Typography>
            <View
              accessibilityLabel={`Category ${capitalize(template.goal.category)}, set by Ohara`}
              style={{
                alignItems: 'center',
                alignSelf: 'flex-start',
                backgroundColor: darkMode ? colors.background.input : accent.tint,
                borderRadius: 999,
                flexDirection: 'row',
                gap: 7,
                paddingHorizontal: 12,
                paddingVertical: 6,
              }}
            >
              <View
                style={{ backgroundColor: accent.color, borderRadius: 4, height: 8, width: 8 }}
              />
              <Typography
                variant="badge-text"
                style={{ color: darkMode ? colors.text.primary : accent.mid, fontFamily: 'Inter-SemiBold' }}
              >
                {capitalize(template.goal.category)}
              </Typography>
            </View>
            <Typography variant="caption" style={{ color: colors.text.muted, marginTop: 6 }}>
              Ohara set this from your conversation. To change it, use “Build it myself”.
            </Typography>
          </View>
          <View>
            <Typography variant="field-label" style={{ marginBottom: 6 }}>
              Deadline
            </Typography>
            <DatePicker
              accessibilityLabel="Goal deadline"
              error={!deadlineValid ? 'Choose a future date.' : null}
              minimumDate={tomorrowInput()}
              onChange={setDeadline}
              value={deadline}
            />
          </View>
        </Card>

        {/* Section 2 — Commitment */}
        <Card elevated padding="spacious" style={[{ gap: 12 }, reviewCardStyle]}>
          <Typography variant="eyebrow">COMMITMENT</Typography>
          <Typography variant="field-label">How many days a week?</Typography>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {[1, 2, 3, 4, 5, 6, 7].map((day) => {
              const selected = daysPerWeek === day;
              return (
                <Pressable
                  key={day}
                  accessibilityLabel={`${day} ${day === 1 ? 'day' : 'days'} per week`}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => setDaysPerWeek(day)}
                  style={({ pressed }) => ({
                    alignItems: 'center',
                    backgroundColor: selected ? accent.color : colors.background.input,
                    borderColor: selected ? accent.color : colors.border.warm,
                    borderRadius: 10,
                    borderWidth: 1.5,
                    flex: 1,
                    opacity: pressed ? 0.72 : 1,
                    paddingVertical: 10,
                  })}
                >
                  <Typography
                    variant="meta"
                    style={{
                      color: selected ? colors.text.onAccent : colors.text.primary,
                      fontFamily: 'Inter-SemiBold',
                    }}
                  >
                    {day}
                  </Typography>
                </Pressable>
              );
            })}
          </View>
          <Typography variant="caption" style={{ color: colors.text.muted }}>
            Tracked per week.
          </Typography>
        </Card>

        {/* Section 3 — Milestones */}
        <Card elevated padding="spacious" style={[{ gap: 12 }, reviewCardStyle]}>
          <View
            style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }}
          >
            <Typography variant="eyebrow">MILESTONES</Typography>
            <Typography variant="caption" style={{ color: colors.text.muted }}>
              {milestones.length}
            </Typography>
          </View>
          {milestones.map((milestone, index) => (
            <View
              key={milestone.id}
              style={{
                backgroundColor: colors.background.input,
                borderRadius: 12,
                gap: 8,
                padding: 12,
              }}
            >
              <View style={{ alignItems: 'flex-start', flexDirection: 'row', gap: 8 }}>
                <View>
                  <Pressable
                    accessibilityLabel={`Move ${milestone.title || 'milestone'} up`}
                    disabled={index === 0}
                    onPress={() => moveMilestone(milestone.id, -1)}
                    style={{ opacity: index === 0 ? 0.25 : 1, padding: 2 }}
                  >
                    <Typography variant="caption">▲</Typography>
                  </Pressable>
                  <Pressable
                    accessibilityLabel={`Move ${milestone.title || 'milestone'} down`}
                    disabled={index === milestones.length - 1}
                    onPress={() => moveMilestone(milestone.id, 1)}
                    style={{ opacity: index === milestones.length - 1 ? 0.25 : 1, padding: 2 }}
                  >
                    <Typography variant="caption">▼</Typography>
                  </Pressable>
                </View>
                <TextInput
                  accessibilityLabel="Milestone title"
                  onChangeText={(value) => updateMilestone(milestone.id, { title: value })}
                  placeholder="Milestone title"
                  placeholderTextColor={colors.text.muted}
                  style={{
                    color: colors.text.primary,
                    flex: 1,
                    fontFamily: 'Inter-SemiBold',
                    fontSize: 14,
                    outlineWidth: 0,
                    padding: 0,
                  }}
                  value={milestone.title}
                />
                <AiSuggestedBadge />
                <Pressable
                  accessibilityLabel={`Remove ${milestone.title || 'milestone'}`}
                  accessibilityRole="button"
                  hitSlop={6}
                  onPress={() => removeMilestone(milestone.id)}
                  style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, padding: 2 })}
                >
                  <Typography variant="body" style={{ color: colors.text.muted, fontSize: 16 }}>
                    ×
                  </Typography>
                </Pressable>
              </View>
              <TextInput
                accessibilityLabel="Milestone description"
                onChangeText={(value) => updateMilestone(milestone.id, { description: value })}
                placeholder="Description (optional)"
                placeholderTextColor={colors.text.muted}
                style={{
                  color: colors.text.secondary,
                  fontFamily: 'Inter-Regular',
                  fontSize: 12.5,
                  outlineWidth: 0,
                  padding: 0,
                }}
                value={milestone.description}
              />
              <DatePicker
                accessibilityLabel="Milestone due date"
                onChange={(value) => updateMilestone(milestone.id, { dueDate: value })}
                style={{ width: 170 }}
                value={milestone.dueDate}
              />
            </View>
          ))}
          <Pressable
            accessibilityRole="button"
            onPress={addMilestone}
            style={({ pressed }) => ({
              alignItems: 'center',
              borderColor: colors.border.input,
              borderRadius: 12,
              borderStyle: 'dashed',
              borderWidth: 1,
              opacity: pressed ? 0.62 : 1,
              padding: 12,
            })}
          >
            <Typography variant="meta">＋ Add milestone</Typography>
          </Pressable>
        </Card>

        {/* Section 4 — Trackers */}
        <Card elevated padding="spacious" style={[{ gap: 12 }, reviewCardStyle]}>
          <View
            style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }}
          >
            <Typography variant="eyebrow">TRACKERS</Typography>
            <Typography variant="caption" style={{ color: colors.text.muted }}>
              {trackers.length}
            </Typography>
          </View>
          {trackers.map((tracker) => (
            <View
              key={tracker.id}
              style={{
                backgroundColor: colors.background.input,
                borderRadius: 12,
                gap: 10,
                padding: 12,
              }}
            >
              <View style={{ alignItems: 'center', flexDirection: 'row', gap: 8 }}>
                <TextInput
                  accessibilityLabel="Tracker title"
                  onChangeText={(value) => updateTracker(tracker.id, { title: value })}
                  placeholder="Tracker title"
                  placeholderTextColor={colors.text.muted}
                  style={{
                    color: colors.text.primary,
                    flex: 1,
                    fontFamily: 'Inter-SemiBold',
                    fontSize: 14,
                    outlineWidth: 0,
                    padding: 0,
                  }}
                  value={tracker.title}
                />
                <AiSuggestedBadge />
                <Pressable
                  accessibilityLabel={`Remove ${tracker.title || 'tracker'}`}
                  accessibilityRole="button"
                  hitSlop={6}
                  onPress={() => removeTracker(tracker.id)}
                  style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, padding: 2 })}
                >
                  <Typography variant="body" style={{ color: colors.text.muted, fontSize: 16 }}>
                    ×
                  </Typography>
                </Pressable>
              </View>
              <View style={{ alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <Pressable
                  accessibilityLabel={`Tracker type ${TRACKER_TYPE_LABELS[tracker.type]}. Activate to change.`}
                  accessibilityRole="button"
                  onPress={() => cycleTrackerType(tracker.id)}
                  style={({ pressed }) => ({
                    backgroundColor: darkMode ? colors.background.card : accent.tint,
                    borderRadius: 999,
                    opacity: pressed ? 0.68 : 1,
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                  })}
                >
                  <Typography
                    variant="badge-text"
                    style={{ color: accent.mid, fontFamily: 'Inter-SemiBold' }}
                  >
                    {TRACKER_TYPE_LABELS[tracker.type]}
                  </Typography>
                </Pressable>
                {tracker.type !== 'checklist' ? (
                  <>
                    <TextInput
                      accessibilityLabel={`${tracker.title || 'Tracker'} target value`}
                      keyboardType="numeric"
                      onChangeText={(value) => updateTracker(tracker.id, { targetValue: value })}
                      placeholder="0"
                      placeholderTextColor={colors.text.muted}
                      style={{
                        backgroundColor: colors.background.card,
                        borderColor: colors.border.warm,
                        borderRadius: 8,
                        borderWidth: 1,
                        color: colors.text.primary,
                        fontFamily: 'Inter-SemiBold',
                        fontSize: 13,
                        outlineWidth: 0,
                        paddingHorizontal: 8,
                        paddingVertical: 6,
                        textAlign: 'center',
                        width: 54,
                      }}
                      value={tracker.targetValue}
                    />
                    <TextInput
                      accessibilityLabel={`${tracker.title || 'Tracker'} unit`}
                      onChangeText={(value) => updateTracker(tracker.id, { targetUnit: value })}
                      placeholder="unit"
                      placeholderTextColor={colors.text.muted}
                      style={{
                        color: colors.text.secondary,
                        fontFamily: 'Inter-Regular',
                        fontSize: 12.5,
                        minWidth: 60,
                        outlineWidth: 0,
                        padding: 0,
                      }}
                      value={tracker.targetUnit}
                    />
                  </>
                ) : null}
                <View style={{ flex: 1 }} />
                <Pressable
                  accessibilityLabel={`Frequency ${TRACKER_FREQUENCY_LABELS[tracker.frequency]}. Activate to change.`}
                  accessibilityRole="button"
                  onPress={() =>
                    updateTracker(tracker.id, { frequency: nextFrequency(tracker.frequency) })
                  }
                  style={({ pressed }) => ({
                    backgroundColor: colors.background.card,
                    borderColor: colors.border.warm,
                    borderRadius: 999,
                    borderWidth: 1,
                    opacity: pressed ? 0.68 : 1,
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                  })}
                >
                  <Typography variant="badge-text" style={{ color: colors.text.secondary }}>
                    {TRACKER_FREQUENCY_LABELS[tracker.frequency]}
                  </Typography>
                </Pressable>
              </View>
            </View>
          ))}
          <Pressable
            accessibilityRole="button"
            onPress={addTracker}
            style={({ pressed }) => ({
              alignItems: 'center',
              borderColor: colors.border.input,
              borderRadius: 12,
              borderStyle: 'dashed',
              borderWidth: 1,
              opacity: pressed ? 0.62 : 1,
              padding: 12,
            })}
          >
            <Typography variant="meta">＋ Add tracker</Typography>
          </Pressable>
        </Card>

        {/* Section 5 — Privacy */}
        <Card elevated padding="compact" style={reviewCardStyle}>
          <View style={{ alignItems: 'center', flexDirection: 'row', gap: 14 }}>
            <View style={{ flex: 1 }}>
              <Typography variant="field-label">Keep this goal private</Typography>
              <Typography variant="caption" style={{ lineHeight: 18, marginTop: 2 }}>
                Private goals stay out of circle features. You can change this later.
              </Typography>
            </View>
            <Toggle
              accessibilityLabel="Keep this goal private"
              onValueChange={setIsPrivate}
              value={isPrivate}
            />
          </View>
        </Card>

        {!trackersValid ? (
          <Typography
            accessibilityRole="alert"
            variant="caption"
            style={{ color: colors.feedback.danger.text, textAlign: 'center' }}
          >
            Every tracker needs a title, and counters need a target above zero with a unit.
          </Typography>
        ) : null}
      </ScrollView>

      {/* Sticky action bar */}
      <View
        style={{
          alignItems: 'center',
          backgroundColor: colors.background.page,
          borderTopColor: colors.border.warm,
          borderTopWidth: 1,
          flexDirection: 'row',
          gap: 10,
          paddingBottom: 14,
          paddingTop: 14,
        }}
      >
        <Button
          onPress={onBack}
          textStyle={{ color: colors.text.muted, fontFamily: 'Inter-Regular' }}
          variant="ghost"
        >
          ← Back
        </Button>
        <View style={{ flex: 1 }} />
        <Typography
          variant="caption"
          style={{ color: colors.text.muted, fontFamily: 'Inter-Regular', fontSize: 12 }}
        >
          Everything look honest?
        </Typography>
        <Pressable
          accessibilityLabel="Save this goal as a draft"
          accessibilityRole="button"
          disabled={!canSubmit}
          onPress={() => void handleSaveDraft()}
          style={({ pressed }) => ({
            alignItems: 'center',
            borderColor: '#3A3A3A',
            borderRadius: 10,
            borderWidth: 1,
            flexDirection: 'row',
            gap: 7,
            opacity: !canSubmit ? 0.45 : pressed ? 0.75 : 1,
            paddingHorizontal: 20,
            paddingVertical: 11,
          })}
        >
          <Typography variant="caption" style={{ color: colors.text.muted, fontSize: 12 }}>
            ◐
          </Typography>
          <Typography
            variant="body"
            style={{ color: colors.text.inverse, fontFamily: 'Inter-Medium', fontSize: 14 }}
          >
            {isSubmitting ? 'Saving…' : 'Save draft'}
          </Typography>
        </Pressable>
        <Button
          disabled={!canSubmit}
          loading={isSubmitting}
          onPress={() => void handleSubmit()}
          style={{ borderRadius: 10, minHeight: 46, paddingHorizontal: 26 }}
          textStyle={{ color: '#0B0B0B', fontFamily: 'Inter-SemiBold' }}
        >
          Create this goal ✓
        </Button>
      </View>
    </View>
  );
}

export default GoalReviewScreen;
