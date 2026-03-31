import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MeasurableCard } from './MeasurableCard';
import type { Measurable, MeasurableInput, MeasurableUpdates, MeasurableType } from '../types';
import { GOAL_MEASURABLE_TYPES } from '@/lib/goals/schema';
import { EmptyStateCard } from '@/components/ui/EmptyStateCard';

interface MeasurablesPanelProps {
  measurables: Measurable[];
  accentColor: string;
  onSave?: (measurableId: string, updates: MeasurableUpdates) => Promise<void>;
  onDelete?: (measurableId: string) => Promise<void>;
  onAdd?: (input: MeasurableInput) => Promise<void>;
  error?: string | null;
  onDismissError?: () => void;
}

const TYPE_LABELS: Record<MeasurableType, string> = {
  counter: 'Counter',
  habit: 'Habit',
  checklist: 'Checklist',
};

export function MeasurablesPanel({
  measurables,
  accentColor,
  onSave,
  onDelete,
  onAdd,
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
    if (addTarget.trim() !== '' && (isNaN(targetNum as number))) {
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
    <View className="mb-2">
      <Text className="text-ink text-base font-semibold mb-3">Measurables</Text>

      {/* Error banner */}
      {error && (
        <View className="bg-red-950 border border-red-900 rounded-xl px-4 py-3 mb-3 flex-row items-center justify-between">
          <Text className="text-red-400 text-xs flex-1 mr-2">{error}</Text>
          <TouchableOpacity onPress={onDismissError}>
            <Text className="text-red-400 text-xs font-semibold">Dismiss</Text>
          </TouchableOpacity>
        </View>
      )}

      {measurables.length === 0 && !showAddForm && (
        <View className="mb-3">
          <EmptyStateCard
            title="No measurables yet."
            description="Add a simple tracker to make progress on this goal easier to see."
          />
        </View>
      )}

      {[...measurables]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((m) => (
          <MeasurableCard
            key={m.id}
            measurable={m}
            accentColor={accentColor}
            onSave={onSave}
            onDelete={onDelete}
          />
        ))}

      {/* Add measurable form */}
      {showAddForm ? (
        <View className="bg-dark-card rounded-xl border border-dark-border p-3.5 mb-2.5">
          {/* Name */}
          <TextInput
            className="text-ink text-sm bg-dark-bg border border-dark-border rounded-lg px-3 py-2 mb-3"
            placeholder="Measurable name"
            placeholderTextColor="#8888A0"
            value={addTitle}
            onChangeText={setAddTitle}
            autoFocus
            returnKeyType="next"
          />

          {/* Type selector */}
          <View className="flex-row gap-2 mb-3">
            {(GOAL_MEASURABLE_TYPES as readonly MeasurableType[]).map((t) => (
              <Pressable
                key={t}
                onPress={() => setAddType(t)}
                className={`flex-1 items-center rounded-lg py-1.5 border ${
                  addType === t ? 'border-transparent' : 'border-dark-border'
                }`}
                style={addType === t ? { backgroundColor: accentColor + '26', borderColor: accentColor } : undefined}
              >
                <Text
                  className="text-xs font-medium"
                  style={addType === t ? { color: accentColor } : { color: '#8888A0' }}
                >
                  {TYPE_LABELS[t]}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Target + Unit (counter only for target; all types for unit optional) */}
          <View className="flex-row gap-2 mb-3">
            <TextInput
              className="flex-1 text-ink text-sm bg-dark-bg border border-dark-border rounded-lg px-3 py-2"
              placeholder="Target (e.g. 10)"
              placeholderTextColor="#8888A0"
              value={addTarget}
              onChangeText={setAddTarget}
              keyboardType="numeric"
              returnKeyType="next"
            />
            <TextInput
              className="flex-1 text-ink text-sm bg-dark-bg border border-dark-border rounded-lg px-3 py-2"
              placeholder="Unit (e.g. km)"
              placeholderTextColor="#8888A0"
              value={addUnit}
              onChangeText={setAddUnit}
              returnKeyType="done"
              onSubmitEditing={handleAdd}
            />
          </View>

          {addError && (
            <Text className="text-red-400 text-xs mb-2">{addError}</Text>
          )}

          <View className="flex-row gap-2">
            <TouchableOpacity
              className="flex-1 items-center py-2 rounded-lg border border-dark-border"
              onPress={resetAddForm}
              disabled={isAdding}
            >
              <Text className="text-ink-dim text-xs font-medium">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 items-center py-2 rounded-lg"
              style={{ backgroundColor: accentColor }}
              onPress={handleAdd}
              disabled={isAdding}
            >
              {isAdding ? (
                <ActivityIndicator size="small" color="#0A0A0F" />
              ) : (
                <Text className="text-xs font-semibold" style={{ color: '#0A0A0F' }}>Add</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        onAdd && (
          <TouchableOpacity
            className="flex-row items-center gap-2 py-2.5 px-3.5 rounded-xl border border-dashed border-dark-border"
            onPress={() => setShowAddForm(true)}
          >
            <Text className="text-ink-dim text-xs">＋ Add measurable</Text>
          </TouchableOpacity>
        )
      )}
    </View>
  );
}
