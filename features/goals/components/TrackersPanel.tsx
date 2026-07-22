import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useThemeColors } from '@/store/uiStore';
import type { Tracker, TrackerFrequency, TrackerInput, TrackerType, TrackerUpdates } from '../types';
import { TrackerCard } from './TrackerCard';

const TRACKER_TYPES: readonly TrackerType[] = ['counter', 'habit', 'checklist'];
const TRACKER_FREQUENCIES: readonly TrackerFrequency[] = ['daily', 'weekly', 'monthly'];

const TYPE_LABELS: Record<TrackerType, string> = {
  counter: 'Counter',
  habit: 'Habit',
  checklist: 'Checklist',
};

const FREQUENCY_LABELS = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
} as const;

function frequencyLabel(frequency: TrackerFrequency): string {
  return frequency in FREQUENCY_LABELS
    ? FREQUENCY_LABELS[frequency as keyof typeof FREQUENCY_LABELS]
    : 'Cadence not set';
}

export interface TrackersPanelProps {
  trackers: readonly Tracker[];
  hasSuccessor: boolean;
  ended: boolean;
  archived?: boolean;
  accentColor?: string;
  progressColor?: string;
  completedIds?: ReadonlySet<string>;
  onAdd?: (input: TrackerInput) => Promise<void>;
  onSave?: (trackerId: string, updates: TrackerUpdates) => Promise<void>;
  onDelete?: (trackerId: string) => Promise<void>;
  onLogComplete?: (trackerId: string) => Promise<void>;
  error?: string | null;
  onDismissError?: () => void;
}

export function TrackersPanel({
  trackers,
  hasSuccessor,
  ended,
  archived = false,
  accentColor,
  progressColor,
  completedIds = new Set<string>(),
  onAdd,
  onSave,
  onDelete,
  onLogComplete,
  error,
  onDismissError,
}: TrackersPanelProps) {
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const compact = width < 520;
  const accent = accentColor ?? colors.accent.primary;
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState('');
  const [type, setType] = useState<TrackerType>('counter');
  const [target, setTarget] = useState('');
  const [unit, setUnit] = useState('');
  const [frequency, setFrequency] = useState<TrackerFrequency>('weekly');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const readOnly = hasSuccessor || ended || archived;
  const sortedTrackers = [...trackers].sort((left, right) => left.sortOrder - right.sortOrder);

  function resetAddForm() {
    setShowAddForm(false);
    setTitle('');
    setType('counter');
    setTarget('');
    setUnit('');
    setFrequency('weekly');
    setValidationError(null);
  }

  async function handleAdd() {
    if (!onAdd) return;
    const trimmedTitle = title.trim();
    const parsedTarget = target.trim() === '' ? null : Number(target);
    if (!trimmedTitle) {
      setValidationError('A tracker name is required.');
      return;
    }
    if (parsedTarget !== null && (!Number.isFinite(parsedTarget) || parsedTarget <= 0)) {
      setValidationError('Target must be greater than zero.');
      return;
    }

    setValidationError(null);
    setIsAdding(true);
    try {
      await onAdd({
        title: trimmedTitle,
        type,
        targetValue: parsedTarget,
        targetUnit: unit.trim() || null,
        frequency,
      });
      resetAddForm();
    } finally {
      setIsAdding(false);
    }
  }

  const inputStyle = {
    backgroundColor: colors.background.input,
    borderColor: colors.border.input,
    borderRadius: 9,
    borderWidth: 1,
    color: colors.text.primary,
    fontFamily: 'Inter-Regular' as const,
    fontSize: 13,
    paddingHorizontal: 12,
    paddingVertical: 9,
  };

  return (
    <View
      accessibilityLabel="Trackers. What you measure each week."
      style={{
        backgroundColor: colors.background.card,
        borderColor: colors.border.warm,
        borderRadius: 20,
        borderWidth: 1,
        elevation: 1,
        paddingHorizontal: compact ? 18 : 26,
        paddingVertical: 24,
        shadowColor: colors.background.sidebar,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 22,
      }}
    >
      <View
        style={{
          alignItems: compact ? 'flex-start' : 'center',
          flexDirection: compact ? 'column' : 'row',
          gap: 8,
          justifyContent: 'space-between',
          marginBottom: 6,
        }}
      >
        <View>
          <Text
            style={{
              color: colors.text.secondary,
              fontFamily: 'Inter-SemiBold',
              fontSize: 11,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
            }}
          >
            Trackers
          </Text>
          <Text
            style={{
              color: colors.text.primary,
              fontFamily: 'Inter-Regular',
              fontSize: 19,
              marginTop: 3,
            }}
          >
            What you measure each week
          </Text>
        </View>
        <Text style={{ color: colors.text.accent, fontFamily: 'Inter-Medium', fontSize: 12.5 }}>
          This week
        </Text>
      </View>
      <Text
        style={{
          color: colors.text.muted,
          fontFamily: 'Inter-Regular',
          fontSize: 13,
          lineHeight: 20,
          marginBottom: 18,
          maxWidth: 560,
        }}
      >
        Small, repeatable reps make progress visible. Keep showing up and the larger outcomes follow.
      </Text>

      {error ? (
        <View
          accessibilityRole="alert"
          style={{
            alignItems: 'center',
            backgroundColor: colors.feedback.danger.bg,
            borderColor: colors.feedback.danger.border,
            borderRadius: 10,
            borderWidth: 1,
            flexDirection: 'row',
            gap: 10,
            justifyContent: 'space-between',
            marginBottom: 14,
            paddingHorizontal: 14,
            paddingVertical: 10,
          }}
        >
          <Text
            style={{
              color: colors.feedback.danger.text,
              flex: 1,
              fontFamily: 'Inter-Regular',
              fontSize: 12,
            }}
          >
            {error}
          </Text>
          {onDismissError ? (
            <Pressable
              accessibilityLabel="Dismiss tracker error"
              accessibilityRole="button"
              onPress={onDismissError}
              style={{ paddingHorizontal: 4, paddingVertical: 3 }}
            >
              <Text
                style={{
                  color: colors.feedback.danger.text,
                  fontFamily: 'Inter-SemiBold',
                  fontSize: 12,
                }}
              >
                Dismiss
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {sortedTrackers.length > 0 ? (
        sortedTrackers.map((tracker) => (
          <TrackerCard
            key={tracker.id}
            accentColor={accent}
            isCompleted={completedIds.has(tracker.id)}
            onDelete={onDelete}
            onLogComplete={onLogComplete}
            onSave={onSave}
            progressColor={progressColor}
            readOnly={readOnly}
            tracker={tracker}
          />
        ))
      ) : !showAddForm ? (
        <View style={{ paddingHorizontal: 2, paddingVertical: 10 }}>
          <Text
            style={{
              color: colors.text.secondary,
              fontFamily: 'Inter-Medium',
              fontSize: 14,
              marginBottom: 3,
            }}
          >
            No repeatable measures yet.
          </Text>
          <Text
            style={{
              color: colors.text.muted,
              fontFamily: 'Inter-Regular',
              fontSize: 12.5,
              lineHeight: 19,
            }}
          >
            Add a counter, habit, or checklist to make weekly progress visible.
          </Text>
        </View>
      ) : null}

      {showAddForm && !readOnly ? (
        <View
          style={{
            backgroundColor: colors.background.page,
            borderColor: colors.border.warm,
            borderRadius: 14,
            borderWidth: 1,
            gap: 10,
            marginTop: sortedTrackers.length > 0 ? 4 : 0,
            padding: 14,
          }}
        >
          <TextInput
            accessibilityLabel="Tracker name"
            autoFocus
            onChangeText={setTitle}
            placeholder="Tracker name"
            placeholderTextColor={colors.text.muted}
            style={inputStyle}
            value={title}
          />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {TRACKER_TYPES.map((trackerType) => {
              const selected = type === trackerType;
              return (
                <Pressable
                  key={trackerType}
                  accessibilityLabel={`Use ${TYPE_LABELS[trackerType]} tracker type`}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => setType(trackerType)}
                  style={{
                    alignItems: 'center',
                    backgroundColor: selected ? colors.background.sidebar : colors.background.card,
                    borderColor: selected ? colors.background.sidebar : colors.border.divider,
                    borderRadius: 9,
                    borderWidth: 1,
                    flexGrow: 1,
                    minWidth: 92,
                    paddingHorizontal: 10,
                    paddingVertical: 7,
                  }}
                >
                  <Text
                    style={{
                      color: selected ? colors.text.inverse : colors.text.secondary,
                      fontFamily: 'Inter-Medium',
                      fontSize: 11.5,
                    }}
                  >
                    {TYPE_LABELS[trackerType]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {TRACKER_FREQUENCIES.map((trackerFrequency) => {
              const selected = frequency === trackerFrequency;
              return (
                <Pressable
                  key={trackerFrequency}
                  accessibilityLabel={`Track ${frequencyLabel(trackerFrequency).toLowerCase()}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => setFrequency(trackerFrequency)}
                  style={{
                    backgroundColor: selected ? colors.accent.tealSubtle : colors.background.card,
                    borderColor: selected ? accent : colors.border.divider,
                    borderRadius: 999,
                    borderWidth: 1,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                  }}
                >
                  <Text
                    style={{
                      color: selected ? colors.text.accent : colors.text.secondary,
                      fontFamily: 'Inter-Medium',
                      fontSize: 11,
                    }}
                  >
                    {frequencyLabel(trackerFrequency)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View style={{ flexDirection: compact ? 'column' : 'row', gap: 8 }}>
            <TextInput
              accessibilityLabel="Tracker target value"
              inputMode="decimal"
              onChangeText={setTarget}
              placeholder="Target (optional)"
              placeholderTextColor={colors.text.muted}
              style={[inputStyle, { flex: 1 }]}
              value={target}
            />
            <TextInput
              accessibilityLabel="Tracker unit"
              onChangeText={setUnit}
              onSubmitEditing={() => void handleAdd()}
              placeholder="Unit (for example km)"
              placeholderTextColor={colors.text.muted}
              returnKeyType="done"
              style={[inputStyle, { flex: 1 }]}
              value={unit}
            />
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
              accessibilityLabel="Cancel adding tracker"
              accessibilityRole="button"
              disabled={isAdding}
              onPress={resetAddForm}
              style={{
                alignItems: 'center',
                borderColor: colors.border.divider,
                borderRadius: 9,
                borderWidth: 1,
                flex: compact ? undefined : 1,
                paddingVertical: 9,
              }}
            >
              <Text style={{ color: colors.text.secondary, fontFamily: 'Inter-Medium', fontSize: 13 }}>
                Cancel
              </Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Add tracker"
              accessibilityRole="button"
              disabled={isAdding}
              onPress={() => void handleAdd()}
              style={{
                alignItems: 'center',
                backgroundColor: accent,
                borderRadius: 9,
                flex: compact ? undefined : 1,
                justifyContent: 'center',
                minHeight: 38,
                opacity: isAdding ? 0.6 : 1,
                paddingHorizontal: 14,
                paddingVertical: 9,
              }}
            >
              {isAdding ? (
                <ActivityIndicator color={colors.text.inverse} size="small" />
              ) : (
                <Text style={{ color: colors.text.inverse, fontFamily: 'Inter-SemiBold', fontSize: 13 }}>
                  Add tracker
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      ) : !readOnly && onAdd ? (
        <Pressable
          accessibilityLabel="Add a tracker"
          accessibilityRole="button"
          onPress={() => setShowAddForm(true)}
          style={({ pressed }) => ({
            alignItems: 'center',
            alignSelf: 'flex-start',
            borderColor: colors.border.divider,
            borderRadius: 10,
            borderStyle: 'dashed',
            borderWidth: 1,
            marginTop: 4,
            opacity: pressed ? 0.72 : 1,
            paddingHorizontal: 15,
            paddingVertical: 10,
          })}
        >
          <Text style={{ color: colors.text.muted, fontFamily: 'Inter-Regular', fontSize: 13 }}>
            ＋ Add a tracker
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
