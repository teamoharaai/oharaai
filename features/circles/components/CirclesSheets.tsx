import { View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Typography } from '@/components/ui/Typography';
import { RADIUS, SPACE } from '@/constants/design';
import { useThemeColors } from '@/store/uiStore';
import { authorName, firstName, toCategory } from '../format';
import { milestoneLabel, milestoneProgress, weeklyTaskLabel } from '../progress';
import type { CircleGoalSummary, CirclesAuthor } from '../types';
import { SharedGoalRow } from './ContextCards';
import { CategoryGlyph, PersonAvatar, ProgressTrack, useCategoryTone } from './primitives';

const SHEET_STYLE = { maxWidth: 480, width: '100%' as const, padding: SPACE['3xl'], borderRadius: RADIUS.xl };

export function PersonSheet({
  person,
  publicGoal,
  goals,
  postCount,
  onClose,
  onViewUpdates,
  onOpenGoal,
}: {
  person: CirclesAuthor | null;
  publicGoal: CircleGoalSummary | null;
  goals: CircleGoalSummary[];
  postCount: number;
  onClose: () => void;
  onViewUpdates: () => void;
  onOpenGoal: (goalId: string) => void;
}) {
  const colors = useThemeColors();
  const name = firstName(person);
  return (
    <Modal closeOnBackdropPress contentStyle={SHEET_STYLE} onClose={onClose} visible={!!person}>
      {person ? (
        <View>
          <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.xl, marginBottom: SPACE.xl }}>
            <PersonAvatar person={person} size={64} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Typography variant="section-header">{authorName(person)}</Typography>
              {person.username ? (
                <Typography variant="caption" style={{ color: colors.text.secondary }}>@{person.username}</Typography>
              ) : null}
            </View>
          </View>
          <Typography variant="meta" style={{ color: colors.text.muted, marginBottom: SPACE.sm }}>
            Public goal
          </Typography>
          {publicGoal ? (
            <SharedGoalRow goal={publicGoal} onPress={() => onOpenGoal(publicGoal.id)} owner={person} selected={false} />
          ) : (
            <Typography variant="caption" style={{ color: colors.text.secondary, marginBottom: SPACE.md }}>
              {name} keeps all Goals private.
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
              {postCount === 0 ? 'No recent updates' : `View ${name}’s updates`}
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
  goal: CircleGoalSummary | null;
  owner: CirclesAuthor | null;
  onClose: () => void;
  onViewUpdates: () => void;
}) {
  const colors = useThemeColors();
  const category = toCategory(goal?.category ?? 'growth');
  const tone = useCategoryTone(category);
  const progress = milestoneProgress(goal?.milestones ?? []);
  const taskLabel = goal ? weeklyTaskLabel(goal) : null;
  const ownerName = firstName(owner);
  return (
    <Modal closeOnBackdropPress contentStyle={SHEET_STYLE} onClose={onClose} visible={!!goal}>
      {goal ? (
        <View>
          <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.lg, marginBottom: SPACE.xl }}>
            <CategoryGlyph category={category} size={52} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Typography variant="section-header">{goal.title}</Typography>
              {owner ? (
                <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.sm, marginTop: 2 }}>
                  <PersonAvatar person={owner} size={20} />
                  <Typography variant="caption" style={{ color: colors.text.secondary }}>Shared by {ownerName}</Typography>
                </View>
              ) : null}
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
                {goal.access === 'public' ? `${ownerName}’s public goal` : `${ownerName} invited you`}
              </Typography>
            </View>
          </View>
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
            {goal.milestones.map((milestone, index) => (
              <View key={`${milestone.title}-${index}`} style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.md }}>
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
            <Button onPress={onViewUpdates} size="compact" variant="outline" textStyle={{ color: colors.text.primary }} style={{ flexGrow: 1 }}>
              Related updates
            </Button>
          </View>
        </View>
      ) : null}
    </Modal>
  );
}
