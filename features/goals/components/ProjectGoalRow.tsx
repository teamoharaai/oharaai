import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { BrandIcon } from '@/components/ui/BrandIcon';
import { Typography } from '@/components/ui/Typography';
import { getCategoryAccentTheme } from '@/constants/themes';
import { elevationStyle, RADIUS, SPACE } from '@/constants/design';
import { useThemeColors, useUIStore } from '@/store/uiStore';
import type { GoalWithDetails } from '../types';

interface ProjectGoalRowProps {
  goal: GoalWithDetails;
  expanded?: boolean;
  onToggleExpanded?: () => void;
}

function formatDate(date: Date | null): string {
  if (!date) return 'No deadline';

  return date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatCommitment(goal: GoalWithDetails): string | null {
  const frequency = goal.targetFrequency;
  if (!frequency) return null;

  if (frequency.period === 'week') {
    return `${frequency.times} day${frequency.times === 1 ? '' : 's'} / week`;
  }

  return `${frequency.times} time${frequency.times === 1 ? '' : 's'} / ${frequency.period}`;
}

export function ProjectGoalRow({
  expanded = false,
  goal,
  onToggleExpanded,
}: ProjectGoalRowProps) {
  const colors = useThemeColors();
  const themeMode = useUIStore((state) => state.themeMode);
  const accent = getCategoryAccentTheme(goal.category);
  const commitment = formatCommitment(goal);

  return (
    <View
      style={{
        ...elevationStyle('sm', colors, themeMode === 'dark'),
        alignItems: 'center',
        backgroundColor: colors.background.card,
        borderColor: colors.border.warmSubtle,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        flexDirection: 'row',
        minHeight: 82,
        overflow: 'hidden',
      }}
    >
      <Pressable
        accessibilityHint="Opens this goal"
        accessibilityLabel={`Open ${goal.title}`}
        accessibilityRole="button"
        onPress={() =>
          router.push({ pathname: '/(app)/goals/[id]' as never, params: { id: goal.id } })
        }
        style={({ pressed }) => ({
          alignItems: 'center',
          flex: 1,
          flexDirection: 'row',
          opacity: pressed ? 0.82 : 1,
          minHeight: 82,
          paddingHorizontal: SPACE.xl,
          paddingVertical: SPACE.lg,
          transform: [{ scale: pressed ? 0.995 : 1 }],
        })}
      >
        <View
          style={{
            alignItems: 'center',
            backgroundColor: themeMode === 'dark' ? colors.background.input : accent.tint,
            borderRadius: RADIUS.md,
            height: 44,
            justifyContent: 'center',
            width: 44,
          }}
        >
          <BrandIcon name="goal-mark" size={18} tintColor={accent.color} />
        </View>

        <View style={{ flex: 1, marginLeft: SPACE.lg, minWidth: 0 }}>
          <Typography
            ellipsizeMode="tail"
            numberOfLines={1}
            variant="title"
            style={{
              fontFamily: 'Inter-SemiBold',
              fontSize: 17,
              letterSpacing: -0.1,
              lineHeight: 23,
            }}
          >
            {goal.title}
          </Typography>
          <Typography
            ellipsizeMode="tail"
            numberOfLines={1}
            variant="meta"
            style={{
              fontSize: 12,
              lineHeight: 16,
            }}
          >
            {formatDate(goal.deadline)}
            {commitment ? ` · ${commitment}` : ''}
          </Typography>
          <View style={{
            backgroundColor: colors.background.input,
            borderRadius: RADIUS.round,
            height: 2,
            marginTop: SPACE.sm,
            overflow: 'hidden',
          }}>
            <View style={{
              backgroundColor: accent.color,
              height: '100%',
              width: `${Math.min(100, Math.max(0, goal.progress))}%`,
            }} />
          </View>
        </View>
        <Typography variant="caption" style={{ color: colors.text.accent, marginLeft: SPACE.lg }}>
          {Math.round(goal.progress)}%
        </Typography>
      </Pressable>

      {onToggleExpanded ? (
        <Pressable
          accessibilityLabel={expanded ? `Collapse ${goal.title}` : `Expand ${goal.title}`}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          hitSlop={8}
          onPress={(event) => {
            event.stopPropagation();
            onToggleExpanded();
          }}
          style={({ pressed }) => ({
            alignItems: 'center',
            height: 44,
            justifyContent: 'center',
            marginHorizontal: SPACE.sm,
            opacity: pressed ? 0.5 : 1,
            width: 44,
          })}
        >
          <Ionicons
            color={accent.color}
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={17}
          />
        </Pressable>
      ) : (
        <Ionicons
          color={accent.color}
          name="arrow-forward"
          size={17}
          style={{ marginHorizontal: 12 }}
        />
      )}
    </View>
  );
}
