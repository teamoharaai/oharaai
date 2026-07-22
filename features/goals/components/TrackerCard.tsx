import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useThemeColors } from '@/store/uiStore';
import type { Tracker, TrackerFrequency, TrackerUpdates } from '../types';

const FREQUENCY_LABELS = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
} as const;

const EDITABLE_FREQUENCIES: readonly TrackerFrequency[] = ['daily', 'weekly', 'monthly'];

export interface TrackerCardProps {
  tracker: Tracker;
  readOnly: boolean;
  isCompleted: boolean;
  accentColor?: string;
  progressColor?: string;
  onSave?: (trackerId: string, updates: TrackerUpdates) => Promise<void>;
  onDelete?: (trackerId: string) => Promise<void>;
  onLogComplete?: (trackerId: string) => Promise<void>;
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
  isCompleted,
  accentColor,
  progressColor,
  onSave,
  onDelete,
  onLogComplete,
}: TrackerCardProps) {
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const compact = width < 500;
  const accent = accentColor ?? colors.accent.primary;
  const progressAccent = progressColor ?? colors.accent.tealMid;
  const [displayValue, setDisplayValue] = useState(tracker.currentValue);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState(tracker.title);
  const [draftCurrent, setDraftCurrent] = useState(String(tracker.currentValue));
  const [draftTarget, setDraftTarget] = useState(String(tracker.targetValue ?? ''));
  const [draftUnit, setDraftUnit] = useState(tracker.targetUnit ?? '');
  const [draftFrequency, setDraftFrequency] = useState<TrackerFrequency | null>(tracker.frequency);

  useEffect(() => {
    setDisplayValue(tracker.currentValue);
    setDraftCurrent(String(tracker.currentValue));
  }, [tracker.currentValue]);

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
    setDraftCurrent(String(tracker.currentValue));
    setDraftTarget(String(tracker.targetValue ?? ''));
    setDraftUnit(tracker.targetUnit ?? '');
    setDraftFrequency(tracker.frequency);
  }

  async function saveEdits() {
    if (!onSave) return;
    const title = draftTitle.trim();
    const current = Number(draftCurrent);
    const target = draftTarget.trim() === '' ? null : Number(draftTarget);
    if (!title) {
      setValidationError('A tracker name is required.');
      return;
    }
    if (!Number.isFinite(current) || current < 0) {
      setValidationError('Current progress must be zero or greater.');
      return;
    }
    if (target !== null && (!Number.isFinite(target) || target <= 0)) {
      setValidationError('Target must be greater than zero.');
      return;
    }

    const updates: TrackerUpdates = {};
    if (title !== tracker.title) updates.title = title;
    if (current !== tracker.currentValue) updates.currentValue = current;
    if (target !== tracker.targetValue) updates.targetValue = target;
    if ((draftUnit.trim() || null) !== tracker.targetUnit) updates.targetUnit = draftUnit.trim() || null;
    if (draftFrequency !== tracker.frequency) updates.frequency = draftFrequency;

    if (Object.keys(updates).length === 0) {
      closeEditor();
      return;
    }

    setValidationError(null);
    setDisplayValue(current);
    setIsSaving(true);
    try {
      await onSave(tracker.id, updates);
      setEditing(false);
    } finally {
      setIsSaving(false);
    }
  }

  async function increment() {
    if (!onSave || readOnly || isSaving) return;
    const next = displayValue + 1;
    setDisplayValue(next);
    setIsSaving(true);
    try {
      await onSave(tracker.id, { currentValue: next });
    } finally {
      setIsSaving(false);
    }
  }

  async function logComplete() {
    if (!onLogComplete || readOnly || isCompleted || isSaving) return;
    setIsSaving(true);
    try {
      await onLogComplete(tracker.id);
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

  const target = tracker.targetValue && tracker.targetValue > 0 ? tracker.targetValue : 1;
  const progress = Math.min(100, Math.max(0, (displayValue / target) * 100));
  const dotCount = Math.min(7, Math.max(1, Math.round(tracker.targetValue ?? 7)));
  const filledDots = Math.min(dotCount, Math.max(0, Math.round(displayValue)));
  const inputStyle = {
    backgroundColor: colors.background.input,
    borderColor: colors.border.input,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.text.primary,
    fontFamily: 'Inter-Regular' as const,
    fontSize: 12.5,
    paddingHorizontal: 10,
    paddingVertical: 8,
  };

  return (
    <View
      accessibilityLabel={`${tracker.title}, ${trackerTypeLabel(tracker.type)}, ${formatNumber(displayValue)}${tracker.targetValue !== null ? ` of ${formatNumber(tracker.targetValue)}` : ''}${tracker.targetUnit ? ` ${tracker.targetUnit}` : ''}`}
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
                fontFamily: 'Inter-SemiBold',
                fontSize: 14.5,
                lineHeight: 20,
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
                  style={{ color: colors.text.accent, fontFamily: 'Inter-SemiBold', fontSize: 9.5 }}
                >
                  ✦ AI
                </Text>
              </View>
            ) : null}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 3 }}>
            <Text style={{ color: colors.text.muted, fontFamily: 'Inter-Regular', fontSize: 11.5 }}>
              {trackerTypeLabel(tracker.type)}
            </Text>
            {tracker.frequency ? (
              <Text style={{ color: colors.text.muted, fontFamily: 'Inter-Regular', fontSize: 11.5 }}>
                · {frequencyLabel(tracker.frequency)}
              </Text>
            ) : null}
          </View>
        </View>

        {!readOnly ? (
          <View style={{ alignItems: 'center', flexDirection: 'row', gap: 3 }}>
            <Pressable
              accessibilityLabel={isCompleted ? `${tracker.title} logged` : `Log ${tracker.title} complete`}
              accessibilityRole="button"
              accessibilityState={{ disabled: !onLogComplete || isCompleted || isSaving }}
              disabled={!onLogComplete || isCompleted || isSaving}
              onPress={() => void logComplete()}
              style={({ pressed }) => ({
                alignItems: 'center',
                backgroundColor: isCompleted ? accent : colors.background.goalCard,
                borderColor: isCompleted ? accent : colors.border.divider,
                borderRadius: 9,
                borderWidth: 1,
                flexDirection: 'row',
                gap: 5,
                minHeight: 30,
                opacity: pressed ? 0.76 : 1,
                paddingHorizontal: 9,
              })}
            >
              <Text
                style={{
                  color: isCompleted ? colors.text.inverse : colors.text.accent,
                  fontFamily: 'Inter-SemiBold',
                  fontSize: 11.5,
                }}
              >
                {isCompleted ? '✓ Logged' : '✓ Log'}
              </Text>
            </Pressable>
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
                {formatNumber(displayValue)}
              </Text>
              {tracker.targetValue !== null ? ` / ${formatNumber(tracker.targetValue)}` : ''}
              {tracker.targetUnit ? ` ${tracker.targetUnit}` : ''}
            </Text>
            {!readOnly && onSave ? (
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
            {Array.from({ length: dotCount }, (_, index) => (
              <View
                key={index}
                style={{
                  backgroundColor: index < filledDots ? colors.brt.rose : colors.border.warmSubtle,
                  borderRadius: 13,
                  height: 26,
                  width: 26,
                }}
              />
            ))}
            <Text
              style={{
                color: colors.text.secondary,
                fontFamily: 'Inter-Regular',
                fontSize: 12,
                marginLeft: 3,
              }}
            >
              {formatNumber(displayValue)}
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
              backgroundColor: isCompleted || displayValue >= target ? accent : 'transparent',
              borderColor: isCompleted || displayValue >= target ? accent : colors.border.divider,
              borderRadius: 5,
              borderWidth: 2,
              height: 22,
              justifyContent: 'center',
              width: 22,
            }}
          >
            {isCompleted || displayValue >= target ? (
              <Text style={{ color: colors.text.inverse, fontFamily: 'Inter-Bold', fontSize: 11 }}>✓</Text>
            ) : null}
          </View>
          <Text
            style={{
              color: isCompleted ? colors.text.muted : colors.text.secondary,
              flex: 1,
              fontFamily: 'Inter-Regular',
              fontSize: 12.5,
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
              accessibilityLabel="Current tracker value"
              inputMode="decimal"
              onChangeText={setDraftCurrent}
              placeholder="Current"
              placeholderTextColor={colors.text.muted}
              style={[inputStyle, { flex: 1 }]}
              value={draftCurrent}
            />
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
                      fontFamily: 'Inter-Medium',
                      fontSize: 11,
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
              style={{ color: colors.feedback.danger.text, fontFamily: 'Inter-Regular', fontSize: 12 }}
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
              <Text style={{ color: colors.text.secondary, fontFamily: 'Inter-Medium', fontSize: 12 }}>
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
              <Text style={{ color: colors.text.inverse, fontFamily: 'Inter-SemiBold', fontSize: 12 }}>
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
          <Text style={{ color: colors.text.secondary, fontFamily: 'Inter-Medium', fontSize: 12 }}>
            Delete this tracker?
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable
              accessibilityLabel="Cancel deleting tracker"
              accessibilityRole="button"
              onPress={() => setDeleting(false)}
              style={{ paddingHorizontal: 10, paddingVertical: 6 }}
            >
              <Text style={{ color: colors.text.secondary, fontFamily: 'Inter-Medium', fontSize: 12 }}>
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
                  fontFamily: 'Inter-SemiBold',
                  fontSize: 12,
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
