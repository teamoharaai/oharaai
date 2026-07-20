import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import type { fetchActiveGoalsFeed } from '@/features/goals/services/goal-service';
import { getGoalRingProgress } from '@/features/goals/utils/ringProgress';
import { formatRelativeTime } from '@/lib/utils/relativeTime';
import { useThemeColors } from '@/store/uiStore';
import { Typography } from './Typography';

export type TodayGoal = Awaited<ReturnType<typeof fetchActiveGoalsFeed>>[number];

interface TodayGoalCardProps {
  goal: TodayGoal;
  projectTitle?: string;
}

export function TodayGoalCard({ goal, projectTitle }: TodayGoalCardProps) {
  const colors = useThemeColors();
  const ringProgress = getGoalRingProgress(goal);
  const progress = ringProgress === null
    ? 0
    : Math.round(Math.min(100, Math.max(0, ringProgress)));
  const lastReflection = formatRelativeTime(goal.lastReflectionAt);

  return (
    <View
      style={{
        backgroundColor: colors.background.card,
        borderColor: colors.border.divider,
        borderRadius: 20,
        borderWidth: 1,
        padding: 20,
      }}
    >
      <View
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'space-between',
        }}
      >
        <Typography variant="eyebrow">Today&apos;s Focus</Typography>
        <Pressable
          accessibilityHint="Opens this goal"
          accessibilityLabel={`Open ${goal.title}`}
          accessibilityRole="button"
          hitSlop={10}
          onPress={() =>
            router.push({
              pathname: '/(app)/goals/[id]' as never,
              params: { id: goal.id },
            })
          }
          style={({ pressed }) => ({ opacity: pressed ? 0.55 : 1 })}
        >
          <Ionicons name="chevron-forward" size={20} color={colors.text.primary} />
        </Pressable>
      </View>

      <View
        style={{
          backgroundColor: colors.border.divider,
          height: 1,
          marginBottom: 18,
          marginTop: 16,
        }}
      />

      {projectTitle ? (
        <Typography
          variant="meta"
          numberOfLines={1}
          style={{ color: colors.text.muted, marginBottom: 6 }}
        >
          {projectTitle}
        </Typography>
      ) : null}

      <Typography
        variant="heading"
        numberOfLines={3}
        style={{ fontSize: 24, lineHeight: 30, marginBottom: 20 }}
      >
        {goal.title}
      </Typography>

      <View
        style={{
          backgroundColor: colors.border.divider,
          borderRadius: 999,
          height: 7,
          overflow: 'hidden',
        }}
      >
        {progress > 0 ? (
          <View
            style={{
              backgroundColor: colors.text.primary,
              borderRadius: 999,
              height: '100%',
              width: `${progress}%`,
            }}
          />
        ) : null}
      </View>

      <Typography variant="emphasis-sm" style={{ marginTop: 10 }}>
        {ringProgress === null ? 'No deadline set' : `${progress}% Complete`}
      </Typography>
      <Typography variant="caption" style={{ marginTop: 5 }}>
        Last Reflection: {lastReflection ?? 'No reflections yet'}
      </Typography>
    </View>
  );
}
