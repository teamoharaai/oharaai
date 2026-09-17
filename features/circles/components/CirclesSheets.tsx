import { useState } from 'react';
import { View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Typography } from '@/components/ui/Typography';
import { RADIUS, SPACE } from '@/constants/design';
import { useThemeColors } from '@/store/uiStore';
import { milestoneLabel, milestoneProgress, weeklyTaskLabel } from '../progress';
import type { CirclePerson, SharedGoal } from '../types';
import { SharedGoalRow, FollowingPill } from './ContextCards';
import {
  CategoryGlyph,
  PersonAvatar,
  ProgressTrack,
  useCategoryTone,
} from './primitives';

const SHEET_STYLE = { maxWidth: 480, width: '100%' as const, padding: SPACE['3xl'], borderRadius: RADIUS.xl };

export function PersonSheet({
  person,
  publicGoal,
  goals,
  postCount,
  onClose,
  onToggleFollowing,
  onViewUpdates,
  onOpenGoal,
}: {
  person: CirclePerson | null;
  publicGoal: SharedGoal | null;
  goals: SharedGoal[];
  postCount: number;
  onClose: () => void;
  onToggleFollowing: () => void;
  onViewUpdates: () => void;
  onOpenGoal: (goalId: string) => void;
}) {
  const colors = useThemeColors();
  return (
    <Modal closeOnBackdropPress contentStyle={SHEET_STYLE} onClose={onClose} visible={!!person}>
      {person ? (
        <View>
          <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.xl, marginBottom: SPACE.xl }}>
            <PersonAvatar person={person} size={64} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Typography variant="section-header">{person.displayName}</Typography>
              <Typography variant="caption" style={{ color: colors.text.secondary }}>{person.activity}</Typography>
            </View>
            <FollowingPill following={person.following} name={person.firstName} onPress={onToggleFollowing} />
          </View>
          <Typography variant="description" style={{ color: colors.text.primary, marginBottom: SPACE['2xl'] }}>
            {person.focus}
          </Typography>
          <Typography variant="meta" style={{ color: colors.text.muted, marginBottom: SPACE.sm }}>
            Public goal
          </Typography>
          {publicGoal ? (
            <SharedGoalRow goal={publicGoal} onPress={() => onOpenGoal(publicGoal.id)} owner={person} selected={false} />
          ) : (
            <Typography variant="caption" style={{ color: colors.text.secondary, marginBottom: SPACE.md }}>
              {person.firstName} keeps all Goals private.
            </Typography>
          )}
          {goals.length > 0 ? (
            <Typography variant="meta" style={{ color: colors.text.muted, marginBottom: SPACE.sm, marginTop: SPACE.lg }}>
              Shared with you
            </Typography>
          ) : null}
          {goals.map((goal) => (
            <SharedGoalRow goal={goal} key={goal.id} onPress={() => onOpenGoal(goal.id)} owner={person} selected={false} />
          ))}
          <View style={{ flexDirection: 'row', gap: SPACE.md, marginTop: SPACE['2xl'] }}>
            <Button onPress={onViewUpdates} size="compact" style={{ flex: 1 }} disabled={postCount === 0}>
              {postCount === 0 ? 'No recent updates' : `View ${person.firstName}’s updates`}
            </Button>
          </View>
        </View>
      ) : null}
    </Modal>
  );
}

export function SharedGoalSheet({
  goal,
  owner,
  onClose,
  onViewUpdates,
}: {
  goal: SharedGoal | null;
  owner: CirclePerson | null;
  onClose: () => void;
  onViewUpdates: () => void;
}) {
  const colors = useThemeColors();
  const tone = useCategoryTone(goal?.category ?? 'growth');
  const progress = milestoneProgress(goal?.milestones ?? []);
  const taskLabel = goal ? weeklyTaskLabel(goal) : null;
  const [encouraged, setEncouraged] = useState(false);
  return (
    <Modal closeOnBackdropPress contentStyle={SHEET_STYLE} onClose={() => { setEncouraged(false); onClose(); }} visible={!!goal}>
      {goal && owner ? (
        <View>
          <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.lg, marginBottom: SPACE.xl }}>
            <CategoryGlyph category={goal.category} size={52} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Typography variant="section-header">{goal.title}</Typography>
              <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.sm, marginTop: 2 }}>
                <PersonAvatar person={owner} size={20} />
                <Typography variant="caption" style={{ color: colors.text.secondary }}>Shared by {owner.firstName}</Typography>
              </View>
            </View>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm, marginBottom: SPACE.xl }}>
            <View style={{ alignItems: 'center', backgroundColor: colors.background.subtle, borderRadius: RADIUS.round, flexDirection: 'row', gap: SPACE.xs, paddingHorizontal: SPACE.md, paddingVertical: SPACE.xs }}>
              <Ionicons color={colors.text.secondary} name="eye-outline" size={13} />
              <Typography variant="meta" style={{ color: colors.text.secondary }}>View only</Typography>
            </View>
            <View style={{ alignItems: 'center', backgroundColor: colors.background.subtle, borderRadius: RADIUS.round, flexDirection: 'row', gap: SPACE.xs, paddingHorizontal: SPACE.md, paddingVertical: SPACE.xs }}>
              <Ionicons color={colors.text.secondary} name={goal.access === 'public' ? 'globe-outline' : 'mail-outline'} size={13} />
              <Typography variant="meta" style={{ color: colors.text.secondary }}>
                {goal.access === 'public' ? `${owner.firstName}’s public goal` : `${owner.firstName} invited you`}
              </Typography>
            </View>
          </View>
          <Typography variant="ai-italic" style={{ color: colors.text.secondary, marginBottom: SPACE.xl }}>
            “{goal.why}”
          </Typography>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACE.sm }}>
            <Typography variant="meta" style={{ color: colors.text.muted }}>Progress</Typography>
            <Typography variant="meta" style={{ color: colors.text.secondary }}>{milestoneLabel(progress)}</Typography>
          </View>
          {progress.ratio !== null ? (
            <ProgressTrack color={tone.fg} value={progress.ratio} style={{ height: 6 }} />
          ) : null}
          {taskLabel ? (
            <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.md }}>
              <Ionicons color={colors.text.secondary} name="repeat-outline" size={14} />
              <Typography variant="caption" style={{ color: colors.text.secondary }}>{taskLabel}</Typography>
            </View>
          ) : null}
          {goal.milestones.length > 0 ? (
            <Typography variant="meta" style={{ color: colors.text.muted, marginBottom: SPACE.sm, marginTop: SPACE['2xl'] }}>
              Milestones
            </Typography>
          ) : null}
          <View style={{ gap: SPACE.sm }}>
            {goal.milestones.map((milestone) => (
              <View key={milestone.title} style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.md }}>
                <Ionicons
                  color={milestone.done ? colors.accent.primary : colors.text.muted}
                  name={milestone.done ? 'checkmark-circle' : 'ellipse-outline'}
                  size={18}
                />
                <Typography variant="body-small" style={{ color: milestone.done ? colors.text.primary : colors.text.secondary }}>
                  {milestone.title}
                </Typography>
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md, marginTop: SPACE['3xl'] }}>
            <Button onPress={() => setEncouraged(true)} size="compact" disabled={encouraged} style={{ flexGrow: 1 }}>
              {encouraged ? `Encouragement sent to ${owner.firstName}` : `Encourage ${owner.firstName}`}
            </Button>
            <Button onPress={onViewUpdates} size="compact" variant="outline" textStyle={{ color: colors.text.primary }} style={{ flexGrow: 1 }}>
              Related updates
            </Button>
          </View>
        </View>
      ) : null}
    </Modal>
  );
}
