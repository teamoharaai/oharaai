import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, TextInput, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { Badge } from '@/components/ui/Badge';
import { Typography } from '@/components/ui/Typography';
import type { Measurable, MeasurableUpdates } from '../types';

interface MeasurableCardProps {
  measurable: Measurable;
  accentColor: string;
  onSave?: (measurableId: string, updates: MeasurableUpdates) => Promise<void>;
  onDelete?: (measurableId: string) => Promise<void>;
  onComplete?: (measurableId: string) => Promise<void>;
  isCompleted: boolean;
}

type EditingField = 'title' | 'targetValue' | 'currentValue' | null;

export function MeasurableCard({
  measurable,
  accentColor,
  onSave,
  onDelete,
  onComplete,
  isCompleted,
}: MeasurableCardProps) {
  const [currentValue, setCurrentValue] = useState(measurable.currentValue);
  const [editingField, setEditingField] = useState<EditingField>(null);
  const [draftTitle, setDraftTitle] = useState(measurable.title);
  const [draftTarget, setDraftTarget] = useState(String(measurable.targetValue ?? ''));
  const [draftCurrent, setDraftCurrent] = useState(String(measurable.currentValue));
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const commitRef = useRef<EditingField>(null);

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
      setCurrentValue(n);
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

  async function handleComplete() {
    if (!onComplete || isCompleted || isSaving) return;
    setIsSaving(true);
    await onComplete(measurable.id);
    setIsSaving(false);
  }

  const target = measurable.targetValue ?? 1;
  const pct = Math.min(100, Math.round((currentValue / target) * 100));
  const canEdit = !!onSave;

  const inputStyle = {
    fontSize: 12,
    color: '#1A1F1C',
    backgroundColor: '#F0EDE6',
    borderWidth: 1,
    borderColor: '#EAE7E0',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  };

  return (
    <Pressable
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#EAE7E0',
        marginBottom: 8,
        padding: 14,
        opacity: isSaving ? 0.7 : 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 1,
      }}
      onPress={() => router.push(`/(app)/goals/${measurable.goalId}/vault` as never)}
      onLongPress={() => {
        if (onDelete && !showDeleteConfirm) setShowDeleteConfirm(true);
      }}
      delayLongPress={400}
    >
      {/* Title row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <TouchableOpacity
          onPress={handleComplete}
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            borderWidth: 2,
            alignItems: 'center',
            justifyContent: 'center',
            borderColor: isCompleted ? '#3D5247' : '#DDD6CA',
            backgroundColor: isCompleted ? '#3D5247' : 'transparent',
          }}
          disabled={!onComplete || isCompleted || isSaving}
        >
          {isCompleted ? (
            <Typography variant="emphasis-sm" style={{ fontFamily: 'Inter-Bold', fontSize: 13, color: '#FFFFFF' }}>✓</Typography>
          ) : null}
        </TouchableOpacity>
        {editingField === 'title' ? (
          <TextInput
            style={[inputStyle, { flex: 1, fontSize: 13, fontFamily: 'Inter-Medium' }]}
            value={draftTitle}
            onChangeText={setDraftTitle}
            onBlur={() => saveField('title')}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={() => commitField('title')}
            selectTextOnFocus
          />
        ) : (
          <Pressable style={{ flex: 1 }} onPress={() => router.push(`/(app)/goals/${measurable.goalId}/vault` as never)}>
            <Typography
              variant="label"
              style={{
                fontSize: 13,
                color: isCompleted ? '#9CA89E' : '#1A1F1C',
                textDecorationLine: isCompleted ? 'line-through' : 'none',
              }}
            >
              {measurable.title}
            </Typography>
          </Pressable>
        )}

        {measurable.isAiSuggested && <Badge label="AI" variant="ai" />}
        {measurable.frequency && (
          <Typography variant="caption" style={{ fontSize: 11 }}>{measurable.frequency}</Typography>
        )}
        {isSaving && <ActivityIndicator size="small" color={accentColor} />}
      </View>

      {/* Counter */}
      {measurable.type === 'counter' && (
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              {editingField === 'currentValue' ? (
                <TextInput
                  style={[inputStyle, { width: 52 }]}
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
                  <Typography variant="label">{currentValue}</Typography>
                </Pressable>
              )}

              <Typography variant="caption">/</Typography>

              {editingField === 'targetValue' ? (
                <TextInput
                  style={[inputStyle, { width: 52 }]}
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
                  <Typography variant="label">
                    {measurable.targetValue ?? '—'}
                  </Typography>
                </Pressable>
              )}

              {measurable.targetUnit && (
                <Typography variant="caption"> {measurable.targetUnit}</Typography>
              )}
            </View>

            <TouchableOpacity
              onPress={handleIncrement}
              style={{
                borderRadius: 999,
                paddingHorizontal: 14,
                paddingVertical: 4,
                backgroundColor: accentColor + '1A',
              }}
              disabled={isSaving}
            >
              <Typography variant="emphasis-sm" style={{ fontSize: 16, color: accentColor }}>+</Typography>
            </TouchableOpacity>
          </View>

          {/* Progress bar */}
          <View style={{ height: 4, borderRadius: 2, overflow: 'hidden', backgroundColor: '#EAE7E0' }}>
            <View
              style={{ height: 4, borderRadius: 2, width: `${pct}%` as `${number}%`, backgroundColor: accentColor }}
            />
          </View>
        </View>
      )}

      {/* Habit */}
      {measurable.type === 'habit' && (() => {
        const done = isCompleted || currentValue === 1;
        return (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <TouchableOpacity
              onPress={handleToggle}
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                borderWidth: 2,
                alignItems: 'center',
                justifyContent: 'center',
                borderColor: done ? accentColor : '#EAE7E0',
                backgroundColor: done ? accentColor + '1A' : 'transparent',
              }}
              disabled={isSaving}
            >
              {done && <Typography variant="emphasis-sm" style={{ fontFamily: 'Inter-Bold', fontSize: 13, color: accentColor }}>✓</Typography>}
            </TouchableOpacity>
            <Typography variant="caption" style={{ color: done ? '#1A1F1C' : '#9CAF9F' }}>
              {done ? 'Done today' : 'Not done yet'}
            </Typography>
          </View>
        );
      })()}

      {/* Checklist */}
      {measurable.type === 'checklist' && (() => {
        const done = isCompleted || currentValue === 1;
        return (
          <TouchableOpacity
            onPress={handleToggle}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
            disabled={isSaving}
          >
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 4,
                borderWidth: 2,
                alignItems: 'center',
                justifyContent: 'center',
                borderColor: done ? accentColor : '#EAE7E0',
                backgroundColor: done ? accentColor : 'transparent',
              }}
            >
              {done && (
                <Typography variant="emphasis-sm" style={{ fontFamily: 'Inter-ExtraBold', fontSize: 10, color: '#FFFFFF' }}>✓</Typography>
              )}
            </View>
            <Typography
              variant="caption"
              style={{
                flex: 1,
                color: done ? '#9CA89E' : '#1A1F1C',
                textDecorationLine: done ? 'line-through' : 'none',
              }}
            >
              {measurable.title}
            </Typography>
          </TouchableOpacity>
        );
      })()}

      {/* Inline delete confirmation */}
      {showDeleteConfirm && (
        <View
          style={{
            marginTop: 12,
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: '#EAE7E0',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography variant="label">Delete this milestone?</Typography>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={{ paddingHorizontal: 12, paddingVertical: 6 }}
              onPress={() => setShowDeleteConfirm(false)}
            >
              <Typography variant="caption">Cancel</Typography>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                backgroundColor: '#FFF5F5',
                borderWidth: 1,
                borderColor: '#FECACA',
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 6,
              }}
              onPress={handleDelete}
            >
              <Typography variant="label" style={{ fontSize: 12, color: '#EF4444' }}>Delete</Typography>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </Pressable>
  );
}
