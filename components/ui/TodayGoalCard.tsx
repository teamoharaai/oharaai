import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import type { fetchActiveGoalsFeed } from '@/features/goals/services/goal-service';
import { getGoalRingProgress } from '@/features/goals/utils/ringProgress';
import { formatRelativeTime } from '@/lib/utils/relativeTime';
import { useThemeColors } from '@/store/uiStore';
import { Typography } from './Typography';

export type TodayGoal = Awaited<ReturnType<typeof fetchActiveGoalsFeed>>[number];

const CARD_HEIGHT = 260;
const TITLE_LINE_HEIGHT = 30;
const TITLE_MAX_LINES = 2;

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
        height: CARD_HEIGHT,
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
        <Typography variant="eyebrow" style={{ color: colors.text.accent }}>
          Today&apos;s Focus
        </Typography>
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
          <Ionicons name="chevron-forward" size={20} color={colors.text.accent} />
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

      <View style={{ height: 20, marginBottom: 6 }}>
        {projectTitle ? (
          <Typography
            variant="meta"
            ellipsizeMode="tail"
            numberOfLines={1}
            style={{ color: colors.text.muted }}
          >
            {projectTitle}
          </Typography>
        ) : null}
      </View>

      <Typography
        variant="heading"
        ellipsizeMode="tail"
        numberOfLines={TITLE_MAX_LINES}
        style={{
          fontSize: 24,
          height: TITLE_LINE_HEIGHT * TITLE_MAX_LINES,
          lineHeight: TITLE_LINE_HEIGHT,
          marginBottom: 20,
        }}
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
              backgroundColor: colors.accent.primary,
              borderRadius: 999,
              height: '100%',
              width: `${progress}%`,
            }}
          />
        ) : null}
      </View>

      <Typography
        variant="emphasis-sm"
        style={{ color: colors.text.accent, marginTop: 10 }}
      >
        {ringProgress === null ? 'No deadline set' : `${progress}% Complete`}
      </Typography>
      <Typography variant="caption" style={{ marginTop: 5 }}>
        Last Entry: {lastReflection ?? 'No entries yet'}
      </Typography>
    </View>
  );
}
