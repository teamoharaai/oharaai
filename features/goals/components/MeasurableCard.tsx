import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Badge } from '@/components/ui/Badge';
import type { Measurable, MeasurableUpdates } from '../types';

interface MeasurableCardProps {
  measurable: Measurable;
  accentColor: string;
  onSave?: (measurableId: string, updates: MeasurableUpdates) => Promise<void>;
  onDelete?: (measurableId: string) => Promise<void>;
}

type EditingField = 'title' | 'targetValue' | 'currentValue' | null;

export function MeasurableCard({ measurable, accentColor, onSave, onDelete }: MeasurableCardProps) {
  const [currentValue, setCurrentValue] = useState(measurable.currentValue);
  const [editingField, setEditingField] = useState<EditingField>(null);
  const [draftTitle, setDraftTitle] = useState(measurable.title);
  const [draftTarget, setDraftTarget] = useState(String(measurable.targetValue ?? ''));
  const [draftCurrent, setDraftCurrent] = useState(String(measurable.currentValue));
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Commit guards: avoid double-save on blur-after-submit
  const commitRef = useRef<EditingField>(null);

  // Sync local state from props (handles optimistic rollback)
  useEffect(() => {
    setCurrentValue(measurable.currentValue);
    setDraftCurrent(String(measurable.currentValue));
  }, [measurable.currentValue]);

  useEffect(() => {
    setDraftTitle(measurable.title);
  }, [measurable.title]);

  useEffect(() => {
    setDraftTarget(String(measurable.targetValue ?? ''));
  }, [measurable.targetValue]);

  async function saveField(field: EditingField) {
    if (!field || !onSave) {
      setEditingField(null);
      return;
    }
    // Guard: if this field was already committed via onSubmitEditing, skip
    if (commitRef.current === field) {
      commitRef.current = null;
      return;
    }
    setEditingField(null);

    let updates: MeasurableUpdates = {};

    if (field === 'title') {
      const trimmed = draftTitle.trim();
      if (!trimmed || trimmed === measurable.title) return;
      updates = { title: trimmed };
    } else if (field === 'targetValue') {
      const n = draftTarget.trim() === '' ? null : parseFloat(draftTarget);
      const prev = measurable.targetValue ?? null;
      if (n === null && prev === null) return;
      if (n !== null && isNaN(n)) return;
      if (n === prev) return;
      updates = { targetValue: n };
    } else if (field === 'currentValue') {
      const n = parseFloat(draftCurrent);
      if (isNaN(n) || n === measurable.currentValue) return;
      setCurrentValue(n); // local optimistic before async
      updates = { currentValue: n };
    }

    setIsSaving(true);
    await onSave(measurable.id, updates);
    setIsSaving(false);
  }

  function commitField(field: EditingField) {
    commitRef.current = field;
    saveField(field);
  }

  async function handleToggle() {
    if (!onSave) return;
    const next = currentValue === 0 ? 1 : 0;
    setCurrentValue(next);
    setIsSaving(true);
    await onSave(measurable.id, { currentValue: next });
    setIsSaving(false);
  }

  async function handleIncrement() {
    if (!onSave) return;
    const next = currentValue + 1;
    setCurrentValue(next);
    setIsSaving(true);
    await onSave(measurable.id, { currentValue: next });
    setIsSaving(false);
  }

  async function handleDelete() {
    setShowDeleteConfirm(false);
    await onDelete?.(measurable.id);
  }

  const target = measurable.targetValue ?? 1;
  const pct = Math.min(100, Math.round((currentValue / target) * 100));
  const canEdit = !!onSave;

  return (
    <Pressable
      className={`bg-dark-card rounded-xl border border-dark-border mb-2.5 p-3.5${isSaving ? ' opacity-60' : ''}`}
      onLongPress={() => {
        if (onDelete && !showDeleteConfirm) setShowDeleteConfirm(true);
      }}
      delayLongPress={400}
    >
      {/* Title row */}
      <View className="flex-row items-center gap-2 mb-3">
        {editingField === 'title' ? (
          <TextInput
            className="flex-1 text-sm font-medium text-ink bg-dark-bg border border-dark-border rounded-lg px-2 py-1"
            value={draftTitle}
            onChangeText={setDraftTitle}
            onBlur={() => saveField('title')}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={() => commitField('title')}
            selectTextOnFocus
          />
        ) : (
          <Pressable className="flex-1" onPress={() => canEdit && setEditingField('title')}>
            <Text className="text-ink text-sm font-medium">{measurable.title}</Text>
          </Pressable>
        )}

        {measurable.isAiSuggested && <Badge label="AI" variant="ai" />}
        {measurable.frequency && (
          <Text className="text-ink-dim text-xs">{measurable.frequency}</Text>
        )}
        {isSaving && <ActivityIndicator size="small" color={accentColor} />}
      </View>

      {/* Counter */}
      {measurable.type === 'counter' && (
        <View>
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center gap-1">
              {editingField === 'currentValue' ? (
                <TextInput
                  className="w-14 text-ink-dim text-xs border border-dark-border rounded px-1.5 py-0.5 bg-dark-bg"
                  value={draftCurrent}
                  onChangeText={setDraftCurrent}
                  keyboardType="numeric"
                  onBlur={() => saveField('currentValue')}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={() => commitField('currentValue')}
                  selectTextOnFocus
                />
              ) : (
                <Pressable onPress={() => canEdit && setEditingField('currentValue')}>
                  <Text className="text-ink-dim text-xs">{currentValue}</Text>
                </Pressable>
              )}

              <Text className="text-ink-dim text-xs">/</Text>

              {editingField === 'targetValue' ? (
                <TextInput
                  className="w-14 text-ink-dim text-xs border border-dark-border rounded px-1.5 py-0.5 bg-dark-bg"
                  value={draftTarget}
                  onChangeText={setDraftTarget}
                  keyboardType="numeric"
                  onBlur={() => saveField('targetValue')}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={() => commitField('targetValue')}
                  selectTextOnFocus
                />
              ) : (
                <Pressable onPress={() => canEdit && setEditingField('targetValue')}>
                  <Text className="text-ink-dim text-xs">{measurable.targetValue ?? '—'}</Text>
                </Pressable>
              )}

              {measurable.targetUnit && (
                <Text className="text-ink-dim text-xs"> {measurable.targetUnit}</Text>
              )}
            </View>

            <TouchableOpacity
              onPress={handleIncrement}
              className="rounded-full px-3.5 py-1"
              style={{ backgroundColor: accentColor + '26' }}
              disabled={isSaving}
            >
              <Text className="text-base font-bold" style={{ color: accentColor }}>+</Text>
            </TouchableOpacity>
          </View>

          <View className="h-1 rounded-sm overflow-hidden bg-dark-border">
            <View className="h-1 rounded-sm" style={{ width: `${pct}%`, backgroundColor: accentColor }} />
          </View>
        </View>
      )}

      {/* Habit */}
      {measurable.type === 'habit' && (() => {
        const done = currentValue === 1;
        return (
          <View className="flex-row items-center gap-2.5">
            <TouchableOpacity
              onPress={handleToggle}
              className="w-7 h-7 rounded-full border-2 items-center justify-center"
              style={{
                borderColor: done ? accentColor : '#1E1E2E',
                backgroundColor: done ? accentColor + '26' : 'transparent',
              }}
              disabled={isSaving}
            >
              {done && <Text className="text-sm font-bold" style={{ color: accentColor }}>✓</Text>}
            </TouchableOpacity>
            <Text className={`text-xs ${done ? 'text-ink' : 'text-ink-dim'}`}>
              {done ? 'Done today' : 'Not done yet'}
            </Text>
          </View>
        );
      })()}

      {/* Checklist */}
      {measurable.type === 'checklist' && (() => {
        const done = currentValue === 1;
        return (
          <TouchableOpacity
            onPress={handleToggle}
            className="flex-row items-center gap-2.5"
            disabled={isSaving}
          >
            <View
              className="w-5 h-5 rounded border-2 items-center justify-center"
              style={{
                borderColor: done ? accentColor : '#1E1E2E',
                backgroundColor: done ? accentColor : 'transparent',
              }}
            >
              {done && <Text className="text-[11px] font-extrabold" style={{ color: '#0A0A0F' }}>✓</Text>}
            </View>
            <Text
              className={`text-xs flex-1 ${done ? 'text-ink-dim line-through' : 'text-ink'}`}
            >
              {measurable.title}
            </Text>
          </TouchableOpacity>
        );
      })()}

      {/* Inline delete confirmation */}
      {showDeleteConfirm && (
        <View className="mt-3 pt-3 border-t border-dark-border flex-row items-center justify-between">
          <Text className="text-ink-dim text-xs">Delete this measurable?</Text>
          <View className="flex-row gap-2">
            <TouchableOpacity
              className="px-3 py-1.5"
              onPress={() => setShowDeleteConfirm(false)}
            >
              <Text className="text-ink-dim text-xs">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="bg-red-950 border border-red-900 rounded-lg px-3 py-1.5"
              onPress={handleDelete}
            >
              <Text className="text-red-400 text-xs font-medium">Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </Pressable>
  );
}
