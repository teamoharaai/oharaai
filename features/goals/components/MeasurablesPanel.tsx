import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MeasurableCard } from './MeasurableCard';
import type { Measurable, MeasurableInput, MeasurableUpdates, MeasurableType } from '../types';
import { GOAL_MEASURABLE_TYPES } from '@/lib/goals/schema';
import { Typography } from '@/components/ui/Typography';
import { useThemeColors } from '@/store/uiStore';

interface MeasurablesPanelProps {
  measurables: Measurable[];
  hasSuccessor: boolean;
  ended: boolean;
  accentColor: string;
  progressColor?: string;
  onSave?: (measurableId: string, updates: MeasurableUpdates) => Promise<void>;
  onDelete?: (measurableId: string) => Promise<void>;
  onAdd?: (input: MeasurableInput) => Promise<void>;
  onComplete?: (measurableId: string) => Promise<void>;
  completedIds: Set<string>;
  vaultItemCount: number;
  error?: string | null;
  onDismissError?: () => void;
}

const TYPE_LABELS: Record<MeasurableType, string> = {
  counter: 'Counter',
  habit: 'Habit',
  checklist: 'Checklist',
};

const SECTION_CARD_STYLE = {
  borderRadius: 16,
  padding: 20,
  marginBottom: 12,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 12,
  elevation: 1,
};

const inputStyle = {
  fontSize: 13,
  borderWidth: 1,
  borderRadius: 10,
  paddingHorizontal: 12,
  paddingVertical: 8,
};

export function MeasurablesPanel({
  measurables,
  hasSuccessor,
  ended,
  accentColor,
  progressColor,
  onSave,
  onDelete,
  onAdd,
  onComplete,
  completedIds,
  vaultItemCount,
  error,
  onDismissError,
}: MeasurablesPanelProps) {
  const colors = useThemeColors();
  const [showAddForm, setShowAddForm] = useState(false);
  const [addTitle, setAddTitle] = useState('');
  const [addType, setAddType] = useState<MeasurableType>('counter');
  const [addTarget, setAddTarget] = useState('');
  const [addUnit, setAddUnit] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const sortedMeasurables = [...measurables].sort((a, b) => a.sortOrder - b.sortOrder);
  const incompleteMeasurables = sortedMeasurables.filter(
    (measurable) => !completedIds.has(measurable.id),
  );
  const completeMeasurables = sortedMeasurables.filter((measurable) =>
    completedIds.has(measurable.id),
  );
  const orderedMeasurables = [...incompleteMeasurables, ...completeMeasurables];

  function resetAddForm() {
    setAddTitle('');
    setAddType('counter');
    setAddTarget('');
    setAddUnit('');
    setAddError(null);
    setShowAddForm(false);
  }

  async function handleAdd() {
    const trimmedTitle = addTitle.trim();
    if (!trimmedTitle) {
      setAddError('Name is required.');
      return;
    }
    if (!onAdd) return;

    const targetNum = addTarget.trim() === '' ? null : parseFloat(addTarget);
    if (addTarget.trim() !== '' && isNaN(targetNum as number)) {
      setAddError('Target must be a number.');
      return;
    }

    setIsAdding(true);
    setAddError(null);
    await onAdd({
      title: trimmedTitle,
      type: addType,
      targetValue: targetNum,
      targetUnit: addUnit.trim() || null,
    });
    setIsAdding(false);
    resetAddForm();
  }

  return (
    <View style={[SECTION_CARD_STYLE, { backgroundColor: colors.background.card }]}>
      {/* Section header */}
      <Typography variant="eyebrow" className="mb-3.5">
        Milestones
      </Typography>

      {/* Error banner */}
      {error && (
        <View
          style={{
            backgroundColor: colors.background.selectedRow,
            borderWidth: 1,
            borderColor: colors.feedback.danger,
            borderRadius: 10,
            paddingHorizontal: 14,
            paddingVertical: 10,
            marginBottom: 12,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text style={{ fontFamily: 'Inter-Regular', fontSize: 12, color: colors.feedback.danger, flex: 1, marginRight: 8 }}>{error}</Text>
          <TouchableOpacity onPress={onDismissError}>
            <Text style={{ fontSize: 12, fontFamily: 'Inter-SemiBold', color: colors.feedback.danger }}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Empty state */}
      {measurables.length === 0 && !showAddForm && (
        <View style={{ paddingVertical: 16, paddingHorizontal: 4, marginBottom: 8 }}>
          <Typography variant="description" style={{ marginBottom: 4 }}>
            Track progress through milestones.
          </Typography>
          <Typography variant="micro-label" style={{ lineHeight: 20 }}>
            Add a counter, habit, or checklist to make progress on this goal visible.
          </Typography>
        </View>
      )}

      {vaultItemCount > 0 && (
        <Typography variant="caption" style={{ marginBottom: 8 }}>
          {vaultItemCount} vault entries
        </Typography>
      )}

      {/* Milestone cards */}
      {orderedMeasurables.map((m) => (
        <MeasurableCard
          key={m.id}
          measurable={m}
          hasSuccessor={hasSuccessor}
          ended={ended}
          accentColor={accentColor}
          progressColor={progressColor}
          onSave={onSave}
          onDelete={onDelete}
          onComplete={onComplete}
          isCompleted={completedIds.has(m.id)}
        />
      ))}

      {/* Add form */}
      {!ended && showAddForm ? (
        <View
          style={{
            backgroundColor: colors.background.page,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.border.divider,
            padding: 14,
            marginTop: 4,
          }}
        >
          {/* Name */}
          <TextInput
            style={[
              inputStyle,
              {
                marginBottom: 10,
                color: colors.text.primary,
                backgroundColor: colors.background.input,
                borderColor: colors.border.input,
              },
            ]}
            placeholder="Milestone name"
            placeholderTextColor={colors.text.muted}
            value={addTitle}
            onChangeText={setAddTitle}
            autoFocus
            returnKeyType="next"
          />

          {/* Type selector */}
          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
            {(GOAL_MEASURABLE_TYPES as readonly MeasurableType[]).map((t) => (
              <Pressable
                key={t}
                onPress={() => setAddType(t)}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  borderRadius: 8,
                  paddingVertical: 6,
                  borderWidth: 1,
                  borderColor: addType === t ? accentColor : colors.border.divider,
                  backgroundColor: addType === t ? accentColor + '1A' : 'transparent',
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: 'Inter-Medium',
                    color: addType === t ? accentColor : colors.text.muted,
                  }}
                >
                  {TYPE_LABELS[t]}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Target + Unit */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
            <TextInput
              style={[
                inputStyle,
                {
                  flex: 1,
                  color: colors.text.primary,
                  backgroundColor: colors.background.input,
                  borderColor: colors.border.input,
                },
              ]}
              placeholder="Target (e.g. 10)"
              placeholderTextColor={colors.text.muted}
              value={addTarget}
              onChangeText={setAddTarget}
              keyboardType="numeric"
              returnKeyType="next"
            />
            <TextInput
              style={[
                inputStyle,
                {
                  flex: 1,
                  color: colors.text.primary,
                  backgroundColor: colors.background.input,
                  borderColor: colors.border.input,
                },
              ]}
              placeholder="Unit (e.g. km)"
              placeholderTextColor={colors.text.muted}
              value={addUnit}
              onChangeText={setAddUnit}
              returnKeyType="done"
              onSubmitEditing={handleAdd}
            />
          </View>

          {addError && (
            <Text style={{ fontFamily: 'Inter-Regular', fontSize: 12, color: colors.feedback.danger, marginBottom: 8 }}>{addError}</Text>
          )}

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={{
                flex: 1,
                alignItems: 'center',
                paddingVertical: 8,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#EAE7E0',
              }}
              onPress={resetAddForm}
              disabled={isAdding}
            >
              <Typography variant="subtitle">Cancel</Typography>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                flex: 1,
                alignItems: 'center',
                paddingVertical: 8,
                borderRadius: 8,
                backgroundColor: accentColor,
              }}
              onPress={handleAdd}
              disabled={isAdding}
            >
              {isAdding ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={{ fontSize: 13, fontFamily: 'Inter-SemiBold', color: '#FFFFFF' }}>Add</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        !ended && onAdd && (
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingVertical: 10,
              paddingHorizontal: 14,
              borderRadius: 10,
              borderWidth: 1,
              borderStyle: 'dashed',
              borderColor: '#EAE7E0',
              marginTop: measurables.length > 0 ? 4 : 0,
            }}
            onPress={() => setShowAddForm(true)}
          >
            <Typography variant="micro-label">＋ Add milestone</Typography>
          </TouchableOpacity>
        )
      )}
    </View>
  );
}
