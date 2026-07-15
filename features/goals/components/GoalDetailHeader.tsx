import { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { GOAL_THEMES } from '@/constants/themes';
import { Badge } from '@/components/ui/Badge';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { Typography } from '@/components/ui/Typography';
import { CountdownTimer } from './CountdownTimer';
import { GoalTitleRow } from './GoalTitleRow';
import type { GoalWithMeasurables } from '../types';

interface GoalDetailHeaderProps {
  goal: GoalWithMeasurables;
  onUpdateDeadline: (deadline: Date | null) => Promise<boolean>;
}

function formatDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getStatusBadgeVariant(status: GoalWithMeasurables['status']): 'active' | 'complete' | 'paused' | 'archived' {
  switch (status) {
    case 'active':    return 'active';
    case 'stagnant':  return 'paused';
    case 'discovered': return 'archived';
    case 'complete':
    default:          return 'complete';
  }
}

export function GoalDetailHeader({ goal, onUpdateDeadline }: GoalDetailHeaderProps) {
  const [descExpanded, setDescExpanded] = useState(false);
  const [editingDeadline, setEditingDeadline] = useState(false);
  const [deadlineInput, setDeadlineInput] = useState('');
  const [deadlineError, setDeadlineError] = useState<string | null>(null);
  const [savingDeadline, setSavingDeadline] = useState(false);
  const theme = GOAL_THEMES[goal.colorTheme];

  function startEditingDeadline() {
    setDeadlineInput(goal.deadline ? formatDateInput(goal.deadline) : '');
    setDeadlineError(null);
    setEditingDeadline(true);
  }

  async function commitDeadline(deadline: Date | null) {
    setSavingDeadline(true);
    const ok = await onUpdateDeadline(deadline);
    setSavingDeadline(false);
    if (!ok) {
      setDeadlineError('Failed to update. Try again.');
      return;
    }
    setEditingDeadline(false);
  }

  async function handleSaveDeadline() {
    const trimmed = deadlineInput.trim();
    if (!trimmed) {
      await commitDeadline(null);
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      setDeadlineError('Use the format YYYY-MM-DD');
      return;
    }
    const parsed = new Date(`${trimmed}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
      setDeadlineError('That date is not valid');
      return;
    }
    await commitDeadline(parsed);
  }

  return (
    <View
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        borderLeftWidth: 4,
        borderLeftColor: theme.accent,
        marginBottom: 12,
        paddingHorizontal: 20,
        paddingVertical: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 16,
        elevation: 2,
      }}
    >
      {/* Badges */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        <Badge label={goal.category} variant="category" />
        <Badge label={goal.status} variant={getStatusBadgeVariant(goal.status)} />
        {goal.aiGenerated && <Badge label="AI" variant="ai" />}
      </View>

      {/* Title */}
      <GoalTitleRow
        title={goal.title}
        variant="heading"
        iconSize={26}
        style={{ marginBottom: goal.description ? 10 : 0 }}
        iconStyle={{ marginTop: 2 }}
        textStyle={{ fontSize: 26, lineHeight: 32 }}
      />

      {/* Description (collapsible) */}
      {goal.description && (
        <TouchableOpacity onPress={() => setDescExpanded((v) => !v)} activeOpacity={0.7}>
          <Typography
            variant="description"
            numberOfLines={descExpanded ? undefined : 2}
          >
            {goal.description}
          </Typography>
          {!descExpanded && goal.description.length > 100 && (
            <Text style={{ fontSize: 12, color: theme.accent, marginTop: 3 }}>Show more</Text>
          )}
        </TouchableOpacity>
      )}

      {/* Divider */}
      <View style={{ height: 1, backgroundColor: '#EAE7E0', marginVertical: 16 }} />

      {/* Progress row: countdown + ring */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        {editingDeadline ? (
          <View style={{ flexShrink: 1, minWidth: 200 }}>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: deadlineError ? '#C0483A' : '#EAE7E0',
                borderRadius: 8,
                paddingHorizontal: 10,
                paddingVertical: 6,
                fontSize: 13,
                color: '#211F1A',
                marginBottom: 6,
              }}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#A79E8E"
              value={deadlineInput}
              onChangeText={(text) => {
                setDeadlineInput(text);
                if (deadlineError) setDeadlineError(null);
              }}
              editable={!savingDeadline}
            />
            {deadlineError && (
              <Text style={{ fontSize: 11, color: '#C0483A', marginBottom: 6 }}>{deadlineError}</Text>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <TouchableOpacity onPress={handleSaveDeadline} disabled={savingDeadline}>
                <Text style={{ fontSize: 12, fontFamily: 'Inter-SemiBold', color: theme.accent }}>
                  {savingDeadline ? 'Saving…' : 'Save'}
                </Text>
              </TouchableOpacity>
              {goal.deadline && (
                <TouchableOpacity onPress={() => commitDeadline(null)} disabled={savingDeadline}>
                  <Text style={{ fontSize: 12, color: '#C0483A' }}>Clear</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => {
                  setEditingDeadline(false);
                  setDeadlineError(null);
                }}
                disabled={savingDeadline}
              >
                <Text style={{ fontSize: 12, color: '#A79E8E' }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            onPress={startEditingDeadline}
            activeOpacity={0.7}
            disabled={goal.has_successor}
            style={{ opacity: goal.has_successor ? 0.5 : 1 }}
          >
            {goal.deadline ? (
              <CountdownTimer deadline={goal.deadline} accentColor={theme.accent} />
            ) : (
              <Typography variant="micro-label" style={{ color: theme.accent }}>
                Set a deadline
              </Typography>
            )}
          </TouchableOpacity>
        )}
        <ProgressRing
          progress={goal.progress}
          size={72}
          strokeWidth={6}
          color={theme.accent}
        />
      </View>
    </View>
  );
}
