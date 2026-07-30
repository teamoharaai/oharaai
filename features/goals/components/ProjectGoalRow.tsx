import { Pressable, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { BrandIcon } from '@/components/ui/BrandIcon';
import { Typography } from '@/components/ui/Typography';
import { getCategoryAccentTheme } from '@/constants/themes';
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
        alignItems: 'center',
        backgroundColor: colors.background.card,
        borderColor: colors.border.warm,
        borderRadius: 12,
        borderWidth: 1,
        flexDirection: 'row',
        minHeight: 56,
        shadowColor: colors.text.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: themeMode === 'dark' ? 0 : 0.04,
        shadowRadius: 6,
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
          paddingBottom: 9,
          paddingLeft: 12,
          paddingTop: 9,
          transform: [{ scale: pressed ? 0.995 : 1 }],
        })}
      >
        <View
          style={{
            alignItems: 'center',
            backgroundColor: themeMode === 'dark' ? colors.background.input : accent.tint,
            borderRadius: 9,
            height: 36,
            justifyContent: 'center',
            width: 36,
          }}
        >
          <BrandIcon name="goal-mark" size={18} tintColor={accent.color} />
        </View>

        <View style={{ flex: 1, marginLeft: 11, minWidth: 0 }}>
          <Typography
            ellipsizeMode="tail"
            numberOfLines={1}
            variant="title"
            style={{
              fontFamily: 'Inter-SemiBold',
              fontSize: 15,
              letterSpacing: -0.1,
              lineHeight: 19,
            }}
          >
            {goal.title}
          </Typography>
          <Typography
            ellipsizeMode="tail"
            numberOfLines={1}
            variant="meta"
            style={{
              fontSize: 11,
              lineHeight: 14,
            }}
          >
            {formatDate(goal.deadline)}
            {commitment ? ` · ${commitment}` : ''}
          </Typography>
        </View>
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
            marginHorizontal: 8,
            opacity: pressed ? 0.5 : 1,
            padding: 4,
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
