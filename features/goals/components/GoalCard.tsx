import { View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { GOAL_THEMES } from '@/constants/themes';
import { Badge } from '@/components/ui/Badge';
import { Typography } from '@/components/ui/Typography';
import type { GoalWithMeasurables } from '../types';

interface GoalCardProps {
  goal: GoalWithMeasurables;
  isNewest?: boolean;
}

function daysUntil(date: Date): number {
  return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export function GoalCard({ goal, isNewest }: GoalCardProps) {
  const theme = GOAL_THEMES[goal.colorTheme];
  const days = goal.deadline ? daysUntil(goal.deadline) : null;

  return (
    <Pressable
      onPress={() =>
        router.push({ pathname: '/goals/[id]', params: { id: goal.id } })
      }
      style={({ pressed }) => ({
        backgroundColor: '#14141F',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#1E1E2E',
        borderLeftWidth: 3,
        borderLeftColor: theme.accent,
        padding: 16,
        opacity: pressed ? 0.85 : 1,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      {/* Top row: category + active badge */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
        <Badge label={goal.category} variant="category" />
        {isNewest && <Badge label="Active" variant="active" />}
        {goal.isPublic && <Badge label="Public" variant="new" />}
      </View>

      {/* Title */}
      <Typography
        variant="title"
        numberOfLines={2}
        style={{ marginBottom: 12 }}
      >
        {goal.title}
      </Typography>

      {/* Progress bar */}
      <View style={{ height: 3, backgroundColor: '#1E1E2E', borderRadius: 2, marginBottom: 12 }}>
        <View
          style={{
            width: `${goal.progress}%`,
            height: 3,
            backgroundColor: theme.accent,
            borderRadius: 2,
          }}
        />
      </View>

      {/* Footer row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="caption">{goal.progress}% complete</Typography>
        {days !== null && (
          <Typography
            variant="caption"
            style={{ color: days > 14 ? '#8888A0' : '#E85D04' }}
          >
            {days > 0 ? `${days}d left` : 'Overdue'}
          </Typography>
        )}
        <Typography variant="caption" style={{ fontSize: 18, lineHeight: 20 }}>⋯</Typography>
      </View>
    </Pressable>
  );
}
