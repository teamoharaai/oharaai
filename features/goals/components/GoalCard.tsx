import { View, Pressable, Alert } from 'react-native';
import { router, usePathname } from 'expo-router';
import { GOAL_THEMES } from '@/constants/themes';
import { Badge } from '@/components/ui/Badge';
import { Typography } from '@/components/ui/Typography';
import { useGoalStore } from '../store';
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
  const pathname = usePathname();
  const deleteGoal = useGoalStore((state) => state.deleteGoal);

  const confirmDelete = () => {
    Alert.alert('Delete goal', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteGoal(goal.id);
            if (pathname === '/goals/[id]') {
              router.replace('/(app)/dashboard');
            }
          } catch {
            Alert.alert('Could not delete goal', 'Please try again.');
          }
        },
      },
    ]);
  };

  const openMenu = () => {
    Alert.alert('Goal options', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete goal',
        style: 'destructive',
        onPress: confirmDelete,
      },
    ]);
  };

  return (
    <Pressable
      onPress={() =>
        router.push({ pathname: '/goals/[id]', params: { id: goal.id } })
      }
      style={({ pressed }) => ({
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderLeftWidth: 3,
        borderLeftColor: theme.accent + '99', // 60% opacity
        padding: 16,
        opacity: pressed ? 0.85 : 1,
        transform: [{ scale: pressed ? 0.98 : 1 }],
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 2,
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
      <View style={{ height: 3, backgroundColor: '#EAE7E0', borderRadius: 2, marginBottom: 12 }}>
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
            style={{ color: days > 0 ? (days > 14 ? '#6B7B6E' : '#C0483A') : '#C0483A' }}
          >
            {days > 0 ? `${days}d left` : 'Overdue'}
          </Typography>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open options for ${goal.title}`}
          hitSlop={8}
          onPress={(event) => {
            event.stopPropagation();
            openMenu();
          }}
        >
          <Typography variant="caption" style={{ fontSize: 18, lineHeight: 20, color: '#9CAF9F' }}>⋯</Typography>
        </Pressable>
      </View>
    </Pressable>
  );
}
