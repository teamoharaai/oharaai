import { View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { Typography } from '@/components/ui/Typography';
import { getGoalRingProgress, getRingColor } from '../utils/ringProgress';
import type { GoalCadence, GoalWithDetails } from '../types';
import { useThemeColors } from '@/store/uiStore';

interface GoalCardProps {
  goal: GoalWithDetails;
  isNewest?: boolean;
}

function formatDeadline(deadline: Date | null): string {
  if (!deadline) return 'No deadline set';

  return deadline.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatCadence(cadence: GoalCadence | null): string {
  if (!cadence) return 'No cadence set';

  if (cadence.period === 'day') {
    return `${cadence.times} ${cadence.times === 1 ? 'time' : 'times'} / day`;
  }

  return `${cadence.times} ${cadence.times === 1 ? 'day' : 'days'} / ${cadence.period}`;
}

export function GoalCard({ goal }: GoalCardProps) {
  const colors = useThemeColors();
  const deadlineProgress = getGoalRingProgress(goal);
  const ringColor = deadlineProgress === null
    ? colors.border.divider
    : getRingColor(deadlineProgress, colors.accent.primary);

  return (
    <Pressable
      accessibilityLabel={`Open goal ${goal.title}`}
      accessibilityRole="button"
      onPress={() =>
        router.push({ pathname: '/(app)/goals/[id]' as never, params: { id: goal.id } })
      }
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor: colors.background.goalCard,
        borderColor: colors.border.warmSubtle,
        borderRadius: 24,
        borderWidth: 1,
        flexDirection: 'row',
        gap: 18,
        minHeight: 112,
        opacity: pressed ? 0.86 : 1,
        paddingHorizontal: 20,
        paddingVertical: 18,
        transform: [{ scale: pressed ? 0.99 : 1 }],
      })}
    >
      <View style={{ flexShrink: 0 }}>
        <ProgressRing
          color={ringColor}
          progress={deadlineProgress ?? 0}
          size={64}
          strokeWidth={5}
          variant="warm"
        />
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <Typography
          numberOfLines={2}
          variant="active-goal-title"
          style={{ marginBottom: 10 }}
        >
          {goal.title}
        </Typography>

        <View style={{ alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Typography variant="meta">
            {formatDeadline(goal.deadline)}
          </Typography>
          <View
            style={{
              backgroundColor: colors.border.divider,
              borderRadius: 2,
              height: 4,
              width: 4,
            }}
          />
          <Typography variant="meta">
            {formatCadence(goal.cadence)}
          </Typography>
        </View>
      </View>

      <View
        style={{
          alignItems: 'center',
          backgroundColor: colors.accent.primary,
          borderRadius: 20,
          flexShrink: 0,
          height: 40,
          justifyContent: 'center',
          width: 40,
        }}
      >
        <Typography
          aria-hidden
          variant="heading"
          style={{ color: colors.text.onAccent }}
        >
          →
        </Typography>
      </View>
    </Pressable>
  );
}
