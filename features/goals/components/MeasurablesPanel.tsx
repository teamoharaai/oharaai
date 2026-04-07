import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MeasurableCard } from './MeasurableCard';
import type { Measurable, MeasurableInput, MeasurableUpdates, MeasurableType } from '../types';
import { GOAL_MEASURABLE_TYPES } from '@/lib/goals/schema';

interface MeasurablesPanelProps {
  measurables: Measurable[];
  accentColor: string;
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
  backgroundColor: '#FFFFFF',
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
  color: '#1A1F1C',
  backgroundColor: '#F0EDE6',
  borderWidth: 1,
  borderColor: '#EAE7E0',
  borderRadius: 10,
  paddingHorizontal: 12,
  paddingVertical: 8,
};

export function MeasurablesPanel({
  measurables,
  accentColor,
  onSave,
  onDelete,
  onAdd,
  onComplete,
  completedIds,
  vaultItemCount,
  error,
  onDismissError,
}: MeasurablesPanelProps) {
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
    <View style={SECTION_CARD_STYLE}>
      {/* Section header */}
      <Text
        style={{
          fontSize: 11,
          fontWeight: '500',
          color: '#6B7B6E',
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          marginBottom: 14,
        }}
      >
        Milestones
      </Text>

      {/* Error banner */}
      {error && (
        <View
          style={{
            backgroundColor: '#FFF5F5',
            borderWidth: 1,
            borderColor: '#FECACA',
            borderRadius: 10,
            paddingHorizontal: 14,
            paddingVertical: 10,
            marginBottom: 12,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text style={{ fontSize: 12, color: '#EF4444', flex: 1, marginRight: 8 }}>{error}</Text>
          <TouchableOpacity onPress={onDismissError}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#EF4444' }}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Empty state */}
      {measurables.length === 0 && !showAddForm && (
        <View style={{ paddingVertical: 16, paddingHorizontal: 4, marginBottom: 8 }}>
          <Text style={{ fontSize: 14, color: '#6B7B6E', marginBottom: 4 }}>
            Track progress through milestones.
          </Text>
          <Text style={{ fontSize: 13, color: '#9CAF9F', lineHeight: 20 }}>
            Add a counter, habit, or checklist to make progress on this goal visible.
          </Text>
        </View>
      )}

      {vaultItemCount > 0 && (
        <Text style={{ fontSize: 12, color: '#9CAF9F', marginBottom: 8 }}>
          {vaultItemCount} vault entries
        </Text>
      )}

      {/* Milestone cards */}
      {orderedMeasurables.map((m) => (
        <MeasurableCard
          key={m.id}
          measurable={m}
          accentColor={accentColor}
          onSave={onSave}
          onDelete={onDelete}
          onComplete={onComplete}
          isCompleted={completedIds.has(m.id)}
        />
      ))}

      {/* Add form */}
      {showAddForm ? (
        <View
          style={{
            backgroundColor: '#F5F1EA',
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#EAE7E0',
            padding: 14,
            marginTop: 4,
          }}
        >
          {/* Name */}
          <TextInput
            style={[inputStyle, { marginBottom: 10 }]}
            placeholder="Milestone name"
            placeholderTextColor="#9CAF9F"
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
                  borderColor: addType === t ? accentColor : '#EAE7E0',
                  backgroundColor: addType === t ? accentColor + '1A' : 'transparent',
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '500',
                    color: addType === t ? accentColor : '#9CAF9F',
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
              style={[inputStyle, { flex: 1 }]}
              placeholder="Target (e.g. 10)"
              placeholderTextColor="#9CAF9F"
              value={addTarget}
              onChangeText={setAddTarget}
              keyboardType="numeric"
              returnKeyType="next"
            />
            <TextInput
              style={[inputStyle, { flex: 1 }]}
              placeholder="Unit (e.g. km)"
              placeholderTextColor="#9CAF9F"
              value={addUnit}
              onChangeText={setAddUnit}
              returnKeyType="done"
              onSubmitEditing={handleAdd}
            />
          </View>

          {addError && (
            <Text style={{ fontSize: 12, color: '#EF4444', marginBottom: 8 }}>{addError}</Text>
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
              <Text style={{ fontSize: 13, color: '#6B7B6E' }}>Cancel</Text>
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
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#FFFFFF' }}>Add</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        onAdd && (
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
            <Text style={{ fontSize: 13, color: '#9CAF9F' }}>＋ Add milestone</Text>
          </TouchableOpacity>
        )
      )}
    </View>
  );
}
