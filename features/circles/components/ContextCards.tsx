import { View } from 'react-native';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { SPACE } from '@/constants/design';
import { useThemeColors } from '@/store/uiStore';
import { firstName, goalStatusBadge, toCategory } from '../format';
import { milestoneProgress } from '../progress';
import type { CircleGoalSummary, CirclesAuthor } from '../types';
import {
  CategoryGlyph,
  ContextCardHeader,
  PressableRow,
  ProgressTrack,
  useCategoryTone,
} from './primitives';

export function SharedGoalRow({
  goal,
  owner,
  selected,
  onPress,
}: {
  goal: CircleGoalSummary;
  owner: CirclesAuthor | null;
  selected: boolean;
  onPress: () => void;
}) {
  const colors = useThemeColors();
  const category = toCategory(goal.category);
  const tone = useCategoryTone(category);
  const badge = goalStatusBadge(goal.status);
  const progress = milestoneProgress(goal.milestones);
  const ownerName = firstName(owner);
  return (
    <PressableRow
      accessibilityLabel={`${goal.title}, shared by ${ownerName}, ${badge.label}`}
      onPress={onPress}
      selected={selected}
    >
      <CategoryGlyph category={category} />
      <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
        <Typography numberOfLines={1} variant="emphasis-sm" style={{ fontSize: 15 }}>
          {goal.title}
        </Typography>
        <Typography numberOfLines={1} variant="caption" style={{ color: colors.text.secondary }}>
          Shared by {ownerName}
        </Typography>
      </View>
      <View style={{ alignItems: 'flex-end', gap: SPACE.sm, width: 92 }}>
        <Badge label={badge.label} variant={badge.variant} />
        {badge.variant === 'active' && progress.ratio !== null ? (
          <ProgressTrack color={tone.fg} style={{ width: 72 }} value={progress.ratio} />
        ) : null}
      </View>
    </PressableRow>
  );
}

export function SharedWithYouCard({
  goals,
  expanded,
  selectedGoalId,
  onSelectGoal,
  onToggleExpanded,
}: {
  goals: CircleGoalSummary[];
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
        {visible.map((goal) => (
          <SharedGoalRow
            goal={goal}
            key={goal.id}
            onPress={() => onSelectGoal(goal.id)}
            owner={goal.owner}
            selected={selectedGoalId === goal.id}
          />
        ))}
      </View>
    </Card>
  );
}
