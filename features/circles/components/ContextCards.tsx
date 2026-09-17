import { Pressable, Text, View } from 'react-native';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { FONT, RADIUS, SPACE, TYPE } from '@/constants/design';
import { useThemeColors } from '@/store/uiStore';
import { milestoneProgress } from '../progress';
import type { CirclePerson, CirclesGoalStatus, SharedGoal } from '../types';
import {
  CategoryGlyph,
  ContextCardHeader,
  PersonAvatar,
  PressableRow,
  ProgressTrack,
  useCategoryTone,
} from './primitives';

const STATUS_BADGE: Record<CirclesGoalStatus, { label: string; variant: 'active' | 'paused' | 'complete' }> = {
  in_progress: { label: 'In progress', variant: 'active' },
  not_started: { label: 'Not started', variant: 'paused' },
  complete: { label: 'Completed', variant: 'complete' },
};

export function SharedGoalRow({
  goal,
  owner,
  selected,
  onPress,
}: {
  goal: SharedGoal;
  owner: CirclePerson;
  selected: boolean;
  onPress: () => void;
}) {
  const colors = useThemeColors();
  const tone = useCategoryTone(goal.category);
  const badge = STATUS_BADGE[goal.status];
  const progress = milestoneProgress(goal.milestones);
  return (
    <PressableRow
      accessibilityLabel={`${goal.title}, shared by ${owner.firstName}, ${badge.label}`}
      onPress={onPress}
      selected={selected}
    >
      <CategoryGlyph category={goal.category} />
      <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
        <Typography numberOfLines={1} variant="emphasis-sm" style={{ fontSize: 15 }}>
          {goal.title}
        </Typography>
        <Typography numberOfLines={1} variant="caption" style={{ color: colors.text.secondary }}>
          Shared by {owner.firstName}
        </Typography>
      </View>
      <View style={{ alignItems: 'flex-end', gap: SPACE.sm, width: 92 }}>
        <Badge label={badge.label} variant={badge.variant} />
        {goal.status === 'in_progress' && progress.ratio !== null ? (
          <ProgressTrack color={tone.fg} style={{ width: 72 }} value={progress.ratio} />
        ) : null}
      </View>
    </PressableRow>
  );
}

export function SharedWithYouCard({
  goals,
  people,
  expanded,
  selectedGoalId,
  onSelectGoal,
  onToggleExpanded,
}: {
  goals: SharedGoal[];
  people: CirclePerson[];
  expanded: boolean;
  selectedGoalId: string | null;
  onSelectGoal: (goalId: string) => void;
  onToggleExpanded: () => void;
}) {
  const colors = useThemeColors();
  const visible = expanded ? goals : goals.slice(0, 3);
  return (
    <Card elevated padding="spacious">
      <ContextCardHeader
        actionLabel={goals.length > 3 ? (expanded ? 'Show less' : 'View all') : undefined}
        onAction={onToggleExpanded}
        subtitle="Goals friends invited you to view"
        title="Shared with You"
      />
      {goals.length === 0 ? (
        <Typography variant="caption" style={{ color: colors.text.secondary }}>
          When a friend invites you to a Goal, accept it in Requests and it will appear here.
        </Typography>
      ) : null}
      <View style={{ gap: SPACE.xs }}>
        {visible.map((goal) => {
          const owner = people.find((person) => person.id === goal.ownerId);
          if (!owner) return null;
          return (
            <SharedGoalRow
              goal={goal}
              key={goal.id}
              onPress={() => onSelectGoal(goal.id)}
              owner={owner}
              selected={selectedGoalId === goal.id}
            />
          );
        })}
      </View>
    </Card>
  );
}

export function FollowingPill({
  following,
  onPress,
  name,
}: {
  following: boolean;
  onPress: () => void;
  name: string;
}) {
  const colors = useThemeColors();
  return (
    <Pressable
      accessibilityLabel={following ? `Following ${name}. Tap to unfollow` : `Follow ${name}`}
      accessibilityRole="button"
      accessibilityState={{ selected: following }}
      onPress={onPress}
      style={({ hovered, pressed }) => ({
        backgroundColor: following
          ? hovered ? colors.background.input : colors.background.subtle
          : hovered ? colors.accent.primaryHover : colors.accent.primary,
        borderColor: following ? colors.border.warm : colors.accent.primary,
        borderRadius: RADIUS.round,
        borderWidth: 1,
        minHeight: 32,
        justifyContent: 'center',
        opacity: pressed ? 0.7 : 1,
        paddingHorizontal: SPACE.lg,
      })}
    >
      <Text
        style={{
          ...TYPE.meta,
          color: following ? colors.text.secondary : colors.text.onAccent,
          fontFamily: FONT.ui.medium,
        }}
      >
        {following ? 'Following' : 'Follow'}
      </Text>
    </Pressable>
  );
}
