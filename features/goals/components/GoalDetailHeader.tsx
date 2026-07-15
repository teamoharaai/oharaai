import { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { router } from 'expo-router';
import { GOAL_THEMES } from '@/constants/themes';
import { Badge } from '@/components/ui/Badge';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { Typography } from '@/components/ui/Typography';
import { CountdownTimer } from './CountdownTimer';
import { ExtendGoalModal } from './ExtendGoalModal';
import { GoalTitleRow } from './GoalTitleRow';
import { getRingColor } from '../utils/ringProgress';
import type { GoalWithMeasurables } from '../types';

interface GoalDetailHeaderProps {
  goal: GoalWithMeasurables;
  isMomentum: boolean;
  isSuperseded: boolean;
  successorGoalId: string | null;
  deadlineProgress: number | null;
  ended: boolean;
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

export function GoalDetailHeader({
  goal,
  isMomentum,
  isSuperseded,
  successorGoalId,
  deadlineProgress,
  ended,
  onUpdateDeadline,
}: GoalDetailHeaderProps) {
  const [descExpanded, setDescExpanded] = useState(false);
  const [showEndedCard, setShowEndedCard] = useState(true);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [editingDeadline, setEditingDeadline] = useState(false);
  const [deadlineInput, setDeadlineInput] = useState('');
  const [deadlineError, setDeadlineError] = useState<string | null>(null);
  const [savingDeadline, setSavingDeadline] = useState(false);
  const theme = GOAL_THEMES[goal.colorTheme];
  const ringColor = isSuperseded
    ? '#B7B0A2'
    : deadlineProgress === null
    ? theme.accent
    : getRingColor(deadlineProgress, theme.accent);

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
        backgroundColor: isSuperseded ? '#F5F2EA' : '#FFFFFF',
        borderRadius: 16,
        borderLeftWidth: 4,
        borderLeftColor: isSuperseded ? '#C7C0B2' : theme.accent,
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
      {isSuperseded && successorGoalId && (
        <TouchableOpacity
          onPress={() => router.push(`/(app)/goals/${successorGoalId}` as never)}
          style={{ alignSelf: 'flex-start', marginBottom: 12 }}
        >
          <Text style={{ color: '#8A8172', fontFamily: 'Inter-Regular', fontSize: 13 }}>
            ‹ Back to current phase
          </Text>
        </TouchableOpacity>
      )}

      {/* Badges */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        <Badge label={goal.category} variant="category" />
        {isSuperseded ? (
          <>
            <Badge label="archived" variant="archived" />
            <Badge label="read-only" variant="archived" />
          </>
        ) : (
          <>
            {isMomentum && <Badge label="↻ Momentum" variant="momentum" />}
            <Badge
              label={ended ? 'ended' : goal.status}
              variant={ended ? 'ended' : getStatusBadgeVariant(goal.status)}
            />
            {goal.aiGenerated && <Badge label="AI" variant="ai" />}
          </>
        )}
      </View>

      {/* Title */}
      <GoalTitleRow
        title={goal.title}
        variant="heading"
        iconSize={26}
        style={{ marginBottom: goal.description ? 10 : isMomentum ? 6 : 0 }}
        iconStyle={{ marginTop: 2 }}
        textStyle={{ fontSize: 26, lineHeight: 32, color: isSuperseded ? '#6E675B' : undefined }}
      />

      {isMomentum && (
        <Typography
          variant="description"
          style={{ fontSize: 13.5, lineHeight: 20, marginBottom: goal.description ? 10 : 0 }}
        >
          You pushed toward this once already. This phase carries that momentum forward.
        </Typography>
      )}

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
            {isSuperseded || ended ? (
              <Text style={{ color: '#E85D04', fontSize: 44, fontFamily: 'Inter-Bold', lineHeight: 48 }}>
                Deadline passed
              </Text>
            ) : goal.deadline ? (
              <CountdownTimer deadline={goal.deadline} accentColor={theme.accent} />
            ) : (
              <Typography variant="micro-label" style={{ color: theme.accent }}>
                Set a deadline
              </Typography>
            )}
          </TouchableOpacity>
        )}
        {(isSuperseded || deadlineProgress !== null) && (
          <ProgressRing
            progress={isSuperseded ? 100 : deadlineProgress ?? 0}
            size={72}
            strokeWidth={6}
            color={ringColor}
          />
        )}
      </View>

      {ended && !isSuperseded && showEndedCard && (
        <View
          style={{
            backgroundColor: '#F8F4EC',
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#EAE7E0',
            padding: 16,
            marginTop: 16,
          }}
        >
          <Text style={{ color: '#211F1A', fontFamily: 'Lora-Italic', fontSize: 20, lineHeight: 26, marginBottom: 6 }}>
            This goal has ended.
          </Text>
          <Text style={{ color: '#6B6257', fontFamily: 'Inter-Regular', fontSize: 13, lineHeight: 19, marginBottom: 14 }}>
            Continue this work in a new phase when you&apos;re ready.
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <TouchableOpacity
              onPress={() => setShowExtendModal(true)}
              style={{ backgroundColor: '#1E3226', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 }}
            >
              <Text style={{ color: '#EDE7DA', fontFamily: 'Inter-SemiBold', fontSize: 12 }}>
                Extend into a new phase
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowEndedCard(false)}
              style={{ borderRadius: 999, borderWidth: 1, borderColor: '#D8D0C2', paddingHorizontal: 14, paddingVertical: 8 }}
            >
              <Text style={{ color: '#4A4339', fontFamily: 'Inter-SemiBold', fontSize: 12 }}>Not now</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ExtendGoalModal
        visible={showExtendModal}
        goal={goal}
        onClose={() => setShowExtendModal(false)}
      />
    </View>
  );
}
