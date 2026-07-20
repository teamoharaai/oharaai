import { View } from 'react-native';
import { router } from 'expo-router';
import { Typography } from '@/components/ui/Typography';
import { GOAL_THEMES } from '@/constants/themes';
import type { ThemeColors } from '@/constants/colors';
import { useThemeColors } from '@/store/uiStore';
import { getGoalRingProgress } from '../utils/ringProgress';
import { GoalRingCard } from './GoalRingCard';
import type { GoalWithDetails } from '../types';

interface GoalRingGridProps {
  goals: GoalWithDetails[];
  emptyMessage?: string;
}

function resolveDueDate(deadline: Date | null, colors: ThemeColors): {
  label?: string;
  color: string;
} {
  if (!deadline) return { color: colors.text.secondary };

  const label = deadline.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
  const days = Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  if (days < 0) {
    return { label, color: colors.feedback.danger.text };
  }
  if (days <= 14) {
    return { label, color: colors.text.secondary };
  }
  return { label, color: colors.text.muted };
}

function resolveActivityLabel(goal: GoalWithDetails): string | undefined {
  const parts = [
    goal.vaultItemCount > 0
      ? `${goal.vaultItemCount} item${goal.vaultItemCount !== 1 ? 's' : ''}`
      : null,
    goal.echoLinkCount > 0
      ? `${goal.echoLinkCount} reflection${goal.echoLinkCount !== 1 ? 's' : ''}`
      : null,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(' · ') : undefined;
}

export function GoalRingGrid({ goals, emptyMessage }: GoalRingGridProps) {
  const colors = useThemeColors();
  if (goals.length === 0) {
    return emptyMessage ? <Typography variant="hint">{emptyMessage}</Typography> : null;
  }

  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 14,
      }}
    >
      {goals.map((goal) => {
        const ringProgress = getGoalRingProgress(goal);
        if (ringProgress === null) return null;

        const { label: dueDateLabel, color: dueDateColor } = resolveDueDate(
          goal.deadline,
          colors,
        );
        return (
          <View
            key={goal.id}
            style={{ flexBasis: '47%', flexGrow: 1, minWidth: 0 }}
          >
            <GoalRingCard
              title={goal.title}
              category={goal.category}
              progress={ringProgress}
              accentColor={GOAL_THEMES[goal.colorTheme].accent}
              activityLabel={resolveActivityLabel(goal)}
              dueDateLabel={dueDateLabel}
              dueDateColor={dueDateColor}
              onPress={() =>
                router.push({
                  pathname: '/(app)/goals/[id]' as never,
                  params: { id: goal.id },
                })
              }
            />
          </View>
        );
      })}
    </View>
  );
}
