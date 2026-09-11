import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useThemeColors } from '@/store/uiStore';
import { FONT, TYPE } from '@/constants/design';
import type { Tracker, TrackerFrequency, TrackerUpdates } from '../types';
import {
  counterProgressPercent,
  currentPeriodValue,
  habitBucketViews,
  isTrackerPeriodComplete,
} from '../tracker-display';

const FREQUENCY_LABELS = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
} as const;

const EDITABLE_FREQUENCIES: readonly TrackerFrequency[] = ['daily', 'weekly', 'monthly'];

export interface TrackerCardProps {
  tracker: Tracker;
  readOnly: boolean;
  accentColor?: string;
  progressColor?: string;
  onSave?: (trackerId: string, updates: TrackerUpdates) => Promise<void>;
  onDelete?: (trackerId: string) => Promise<void>;
  onLogComplete?: (trackerId: string) => Promise<void>;
  onLogUncomplete?: (trackerId: string) => Promise<void>;
  onLogCounter?: (trackerId: string) => Promise<void>;
}

function trackerTypeLabel(type: Tracker['type']): string {
  if (type === 'counter') return 'Counter';
  if (type === 'habit') return 'Habit';
  return 'Checklist';
}

function frequencyLabel(frequency: TrackerFrequency): string {
  return frequency in FREQUENCY_LABELS
    ? FREQUENCY_LABELS[frequency as keyof typeof FREQUENCY_LABELS]
    : 'Cadence not set';
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

export function TrackerCard({
  tracker,
  readOnly,
  accentColor,
  progressColor,
  onSave,
  onDelete,
  onLogComplete,
  onLogUncomplete,
  onLogCounter,
}: TrackerCardProps) {
  // DISPLAY and completion are DB-derived from the log-derived period state, not
  // the legacy `tracker.currentValue` scalar or a local set. A null/unhydrated
  // periodState is never presented as an authoritative incomplete result; its
  // current value falls back to 0 (Task 8 drives full card display off periodState).
  const isCompleted = isTrackerPeriodComplete(tracker.periodState);
  const currentValue = currentPeriodValue(tracker.periodState);
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const compact = width < 500;
  const accent = accentColor ?? colors.accent.primary;
  const progressAccent = progressColor ?? colors.accent.tealMid;
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState(tracker.title);
  const [draftTarget, setDraftTarget] = useState(String(tracker.targetValue ?? ''));
  const [draftUnit, setDraftUnit] = useState(tracker.targetUnit ?? '');
  const [draftFrequency, setDraftFrequency] = useState<TrackerFrequency | null>(tracker.frequency);

  useEffect(() => {
    setDraftTitle(tracker.title);
    setDraftTarget(String(tracker.targetValue ?? ''));
    setDraftUnit(tracker.targetUnit ?? '');
    setDraftFrequency(tracker.frequency);
  }, [tracker.frequency, tracker.targetUnit, tracker.targetValue, tracker.title]);

  function closeEditor() {
    setEditing(false);
    setValidationError(null);
    setDraftTitle(tracker.title);
    setDraftTarget(String(tracker.targetValue ?? ''));
    setDraftUnit(tracker.targetUnit ?? '');
    setDraftFrequency(tracker.frequency);
  }

  async function saveEdits() {
    if (!onSave) return;
    const title = draftTitle.trim();
    const target = draftTarget.trim() === '' ? null : Number(draftTarget);
    if (!title) {
      setValidationError('A tracker name is required.');
      return;
    }
    if (target !== null && (!Number.isFinite(target) || target <= 0)) {
      setValidationError('Target must be greater than zero.');
      return;
    }

    // Current progress is no longer client-writable: tracker_logs is the
    // canonical evidence, so the manual current-progress field is gone and
    // progress changes flow through authenticated logging (counter +1 / complete).
    const updates: TrackerUpdates = {};
    if (title !== tracker.title) updates.title = title;
    if (target !== tracker.targetValue) updates.targetValue = target;
    if ((draftUnit.trim() || null) !== tracker.targetUnit) updates.targetUnit = draftUnit.trim() || null;
    if (draftFrequency !== tracker.frequency) updates.frequency = draftFrequency;

    if (Object.keys(updates).length === 0) {
      closeEditor();
      return;
    }

    setValidationError(null);
    setIsSaving(true);
    try {
      await onSave(tracker.id, updates);
      setEditing(false);
    } finally {
      setIsSaving(false);
    }
  }

  async function increment() {
    // Counter +1 logs a value-1 row through the authenticated tracker-log
    // mutation (tracker_logs is canonical; trackers.current_value is never
    // written). Task 6 adds the optimistic bucket update + in-flight guard.
    if (!onLogCounter || readOnly || isSaving) return;
    setIsSaving(true);
    try {
      await onLogCounter(tracker.id);
    } finally {
      setIsSaving(false);
    }
  }

  // Explicit complete/uncomplete toggle for habit/checklist (counters progress by
  // +1, not one-tap complete). Distinct from the edit/delete controls so the card
  // as a whole is never an undo target: only this control flips completion.
  async function toggleComplete() {
    if (readOnly || isSaving) return;
    const handler = isCompleted ? onLogUncomplete : onLogComplete;
    if (!handler) return;
    setIsSaving(true);
    try {
      await handler(tracker.id);
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteTracker() {
    setDeleting(false);
    setIsSaving(true);
    try {
      await onDelete?.(tracker.id);
    } finally {
      setIsSaving(false);
    }
  }

  const progress = counterProgressPercent(currentValue, tracker.targetValue);
  const habitBuckets = habitBucketViews(tracker.periodState, tracker.frequency);
  // The accessible toggle acts on whichever direction applies next; it is disabled
  // when that handler is absent (e.g. a completed card with no uncomplete wired).
  const toggleHandler = isCompleted ? onLogUncomplete : onLogComplete;
  const toggleDisabled = !toggleHandler || isSaving;
  const inputStyle = {
    backgroundColor: colors.background.input,
    borderColor: colors.border.input,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.text.primary,
    ...TYPE.bodySmall,
    paddingHorizontal: 10,
    paddingVertical: 8,
  };

  return (
    <View
      accessibilityLabel={`${tracker.title}, ${trackerTypeLabel(tracker.type)}, ${formatNumber(currentValue)}${tracker.targetValue !== null ? ` of ${formatNumber(tracker.targetValue)}` : ''}${tracker.targetUnit ? ` ${tracker.targetUnit}` : ''}`}
      style={{
        backgroundColor: colors.background.card,
        borderColor: colors.border.warm,
        borderRadius: 14,
        borderWidth: 1,
        marginBottom: 10,
        opacity: readOnly ? 0.72 : isSaving ? 0.78 : 1,
        paddingHorizontal: compact ? 14 : 18,
        paddingVertical: 16,
      }}
    >
      <View
        style={{
          alignItems: 'flex-start',
          flexDirection: 'row',
          gap: 10,
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
            <Text
              style={{
                color: colors.text.primary,
                flexShrink: 1,
                fontFamily: FONT.ui.semibold,
                fontSize: 16,
                lineHeight: 22,
              }}
            >
              {tracker.title}
            </Text>
            {tracker.isAiSuggested ? (
              <View
                style={{
                  backgroundColor: colors.accent.tealSubtle,
                  borderRadius: 6,
                  paddingHorizontal: 7,
                  paddingVertical: 2,
                }}
              >
                <Text
                  style={{ color: colors.text.accent, ...TYPE.meta, fontFamily: FONT.ui.semibold }}
                >
                  ✦ AI
                </Text>
              </View>
            ) : null}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 3 }}>
            <Text style={{ color: colors.text.muted, ...TYPE.caption }}>
              {trackerTypeLabel(tracker.type)}
            </Text>
            {tracker.frequency ? (
              <Text style={{ color: colors.text.muted, ...TYPE.caption }}>
                · {frequencyLabel(tracker.frequency)}
              </Text>
            ) : null}
          </View>
        </View>

        {!readOnly ? (
          <View style={{ alignItems: 'center', flexDirection: 'row', gap: 3 }}>
            {/* Counters progress by logging their value (+1), not one-tap complete.
                Habit/checklist get an explicit checkbox toggle that both logs and
                undoes the current period without navigating. */}
            {tracker.type !== 'counter' ? (
              <Pressable
                accessibilityLabel={
                  isCompleted
                    ? `Mark ${tracker.title} not done this period`
                    : `Mark ${tracker.title} done this period`
                }
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isCompleted, disabled: toggleDisabled }}
                disabled={toggleDisabled}
                onPress={() => void toggleComplete()}
                style={({ pressed }) => ({
                  alignItems: 'center',
                  backgroundColor: isCompleted ? accent : colors.background.goalCard,
                  borderColor: isCompleted ? accent : colors.border.divider,
                  borderRadius: 9,
                  borderWidth: 1,
                  flexDirection: 'row',
                  gap: 5,
                  minHeight: 36,
                  opacity: pressed ? 0.76 : 1,
                  paddingHorizontal: 9,
                })}
              >
                <Text
                  style={{
                    color: isCompleted ? colors.text.inverse : colors.text.accent,
                    ...TYPE.caption,
                    fontFamily: FONT.ui.medium,
                  }}
                >
                  {isCompleted ? '✓ Logged' : '✓ Log'}
                </Text>
              </Pressable>
            ) : null}
            {onSave ? (
              <Pressable
                accessibilityLabel={`Edit ${tracker.title}`}
                accessibilityRole="button"
                onPress={() => {
                  setDeleting(false);
                  setEditing((current) => !current);
                }}
                style={{ alignItems: 'center', height: 30, justifyContent: 'center', width: 30 }}
              >
                <Text style={{ color: colors.text.muted, fontFamily: 'Inter-Regular', fontSize: 14 }}>✎</Text>
              </Pressable>
            ) : null}
            {onDelete ? (
              <Pressable
                accessibilityLabel={`Delete ${tracker.title}`}
                accessibilityRole="button"
                onPress={() => {
                  setEditing(false);
                  setDeleting(true);
                }}
                style={{ alignItems: 'center', height: 30, justifyContent: 'center', width: 30 }}
              >
                <Text style={{ color: colors.text.muted, fontFamily: 'Inter-Regular', fontSize: 14 }}>⌫</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
        {isSaving ? <ActivityIndicator color={accent} size="small" /> : null}
      </View>

      {tracker.type === 'counter' ? (
        <View>
          <View
            style={{
              alignItems: 'center',
              flexDirection: 'row',
              gap: 10,
              justifyContent: 'space-between',
              marginBottom: 9,
            }}
          >
            <Text
              style={{ color: colors.text.secondary, fontFamily: 'Inter-Regular', fontSize: 13 }}
            >
              <Text
                style={{ color: colors.text.primary, fontFamily: 'Inter-SemiBold', fontSize: 15 }}
              >
                {formatNumber(currentValue)}
              </Text>
              {tracker.targetValue !== null ? ` / ${formatNumber(tracker.targetValue)}` : ''}
              {tracker.targetUnit ? ` ${tracker.targetUnit}` : ''}
            </Text>
            {!readOnly && onLogCounter ? (
              <Pressable
                accessibilityLabel={`Add one to ${tracker.title}`}
                accessibilityRole="button"
                disabled={isSaving}
                onPress={() => void increment()}
                style={({ pressed }) => ({
                  alignItems: 'center',
                  backgroundColor: colors.accent.tealSubtle,
                  borderRadius: 999,
                  height: 30,
                  justifyContent: 'center',
                  opacity: pressed ? 0.72 : 1,
                  width: 42,
                })}
              >
                <Text style={{ color: accent, fontFamily: 'Inter-SemiBold', fontSize: 18 }}>+1</Text>
              </Pressable>
            ) : null}
          </View>
          <View
            accessibilityLabel={`${Math.round(progress)} percent of target`}
            style={{
              backgroundColor: colors.border.warmSubtle,
              borderRadius: 5,
              height: 8,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                backgroundColor: progressAccent,
                borderRadius: 5,
                height: 8,
                width: `${progress}%`,
              }}
            />
          </View>
        </View>
      ) : tracker.type === 'habit' ? (
        <View>
          <View
            style={{
              alignItems: 'center',
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 6,
            }}
          >
            {habitBuckets.map((bucket) => (
              <View
                key={bucket.key}
                accessibilityLabel={bucket.accessibilityLabel}
                accessibilityRole="image"
                style={{
                  backgroundColor: bucket.filled ? colors.brt.rose : colors.border.warmSubtle,
                  borderRadius: 13,
                  height: 26,
                  width: 26,
                }}
              />
            ))}
            <Text
              style={{
                color: colors.text.secondary,
                ...TYPE.caption,
                marginLeft: 3,
              }}
            >
              {formatNumber(currentValue)}
              {tracker.targetValue !== null ? ` / ${formatNumber(tracker.targetValue)}` : ''}
              {tracker.targetUnit ? ` ${tracker.targetUnit}` : ''}
            </Text>
          </View>
        </View>
      ) : (
        <View
          style={{
            alignItems: 'center',
            flexDirection: 'row',
            gap: 10,
          }}
        >
          <View
            style={{
              alignItems: 'center',
              backgroundColor: isCompleted ? accent : 'transparent',
              borderColor: isCompleted ? accent : colors.border.divider,
              borderRadius: 5,
              borderWidth: 2,
              height: 22,
              justifyContent: 'center',
              width: 22,
            }}
          >
            {isCompleted ? (
              <Text style={{ color: colors.text.inverse, fontFamily: FONT.ui.bold, fontSize: 12 }}>✓</Text>
            ) : null}
          </View>
          <Text
            style={{
              color: isCompleted ? colors.text.muted : colors.text.secondary,
              flex: 1,
              ...TYPE.bodySmall,
              textDecorationLine: isCompleted ? 'line-through' : 'none',
            }}
          >
            {isCompleted ? 'Logged for this period' : 'Not logged yet'}
          </Text>
        </View>
      )}

      {editing && !readOnly ? (
        <View
          style={{
            borderTopColor: colors.border.divider,
            borderTopWidth: 1,
            gap: 9,
            marginTop: 14,
            paddingTop: 14,
          }}
        >
          <TextInput
            accessibilityLabel="Tracker name"
            autoFocus
            onChangeText={setDraftTitle}
            placeholder="Tracker name"
            placeholderTextColor={colors.text.muted}
            style={inputStyle}
            value={draftTitle}
          />
          <View style={{ flexDirection: compact ? 'column' : 'row', gap: 8 }}>
            <TextInput
              accessibilityLabel="Tracker target value"
              inputMode="decimal"
              onChangeText={setDraftTarget}
              placeholder="Target"
              placeholderTextColor={colors.text.muted}
              style={[inputStyle, { flex: 1 }]}
              value={draftTarget}
            />
            <TextInput
              accessibilityLabel="Tracker unit"
              onChangeText={setDraftUnit}
              placeholder="Unit"
              placeholderTextColor={colors.text.muted}
              style={[inputStyle, { flex: 1 }]}
              value={draftUnit}
            />
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {EDITABLE_FREQUENCIES.map((frequency) => {
              const selected = draftFrequency === frequency;
              return (
                <Pressable
                  key={frequency}
                  accessibilityLabel={`Set frequency to ${frequencyLabel(frequency)}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => setDraftFrequency(frequency)}
                  style={{
                    backgroundColor: selected ? colors.background.sidebar : colors.background.card,
                    borderColor: selected ? colors.background.sidebar : colors.border.divider,
                    borderRadius: 999,
                    borderWidth: 1,
                    paddingHorizontal: 11,
                    paddingVertical: 6,
                  }}
                >
                  <Text
                    style={{
                      color: selected ? colors.text.inverse : colors.text.secondary,
                      ...TYPE.caption,
                      fontFamily: FONT.ui.medium,
                    }}
                  >
                    {frequencyLabel(frequency)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {validationError ? (
            <Text
              accessibilityRole="alert"
              style={{ color: colors.feedback.danger.text, ...TYPE.caption }}
            >
              {validationError}
            </Text>
          ) : null}
          <View style={{ flexDirection: compact ? 'column-reverse' : 'row', gap: 8 }}>
            <Pressable
              accessibilityLabel="Cancel tracker changes"
              accessibilityRole="button"
              disabled={isSaving}
              onPress={closeEditor}
              style={{
                alignItems: 'center',
                borderColor: colors.border.divider,
                borderRadius: 8,
                borderWidth: 1,
                flex: compact ? undefined : 1,
                paddingVertical: 8,
              }}
            >
              <Text style={{ color: colors.text.secondary, ...TYPE.bodySmall, fontFamily: FONT.ui.medium }}>
                Cancel
              </Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Save tracker changes"
              accessibilityRole="button"
              disabled={isSaving}
              onPress={() => void saveEdits()}
              style={{
                alignItems: 'center',
                backgroundColor: accent,
                borderRadius: 8,
                flex: compact ? undefined : 1,
                paddingVertical: 8,
              }}
            >
              <Text style={{ color: colors.text.inverse, ...TYPE.bodySmall, fontFamily: FONT.ui.medium }}>
                Save
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {deleting && !readOnly ? (
        <View
          style={{
            alignItems: compact ? 'stretch' : 'center',
            borderTopColor: colors.border.divider,
            borderTopWidth: 1,
            flexDirection: compact ? 'column' : 'row',
            gap: 8,
            justifyContent: 'space-between',
            marginTop: 14,
            paddingTop: 12,
          }}
        >
          <Text style={{ color: colors.text.secondary, ...TYPE.bodySmall, fontFamily: FONT.ui.medium }}>
            Delete this tracker?
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable
              accessibilityLabel="Cancel deleting tracker"
              accessibilityRole="button"
              onPress={() => setDeleting(false)}
              style={{ paddingHorizontal: 10, paddingVertical: 6 }}
            >
              <Text style={{ color: colors.text.secondary, ...TYPE.bodySmall, fontFamily: FONT.ui.medium }}>
                Cancel
              </Text>
            </Pressable>
            <Pressable
              accessibilityLabel={`Delete ${tracker.title}`}
              accessibilityRole="button"
              onPress={() => void deleteTracker()}
              style={{
                backgroundColor: colors.feedback.danger.bg,
                borderColor: colors.feedback.danger.border,
                borderRadius: 8,
                borderWidth: 1,
                paddingHorizontal: 10,
                paddingVertical: 6,
              }}
            >
              <Text
                style={{
                  color: colors.feedback.danger.text,
                  ...TYPE.bodySmall,
                  fontFamily: FONT.ui.medium,
                }}
              >
                Delete
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}
