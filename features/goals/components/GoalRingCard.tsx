import { View, Pressable } from 'react-native';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { Badge } from '@/components/ui/Badge';
import { Typography } from '@/components/ui/Typography';
import { useThemeColors } from '@/store/uiStore';
import { getRingColor } from '../utils/ringProgress';
import { GoalTitleRow } from './GoalTitleRow';

interface GoalRingCardProps {
  title: string;
  /** Category label shown in the chip (e.g. "Fitness"). */
  category: string;
  /**
   * 0–100, drives the ring fill and centered percentage. Caller resolves the
   * meaning is time elapsed toward the deadline (see
   * features/goals/utils/ringProgress.ts). Goals without deadlines omit this
   * card rather than substituting tracker or milestone completion.
   */
  progress: number;
  /** Goal's category/theme accent (from GOAL_THEMES), before deadline urgency escalation. */
  accentColor: string;
  /** Footer-left activity line, e.g. "4 items · 2 reflections". */
  activityLabel?: string;
  /** Footer-right due-date label, e.g. "Jul 30". */
  dueDateLabel?: string;
  /**
   * Resolved due-date tone. The redesign's overdue/soon warning colors are not
   * yet in the token set, so the caller supplies the resolved color; defaults to
   * the muted-secondary token. (See Session 5b — due-date color decision.)
   */
  dueDateColor?: string;
  onPress?: () => void;
}

export function GoalRingCard({
  title,
  category,
  progress,
  accentColor,
  activityLabel,
  dueDateLabel,
  dueDateColor,
  onPress,
}: GoalRingCardProps) {
  const colors = useThemeColors();
  const ringColor = getRingColor(progress, accentColor);
  const resolvedDueDateColor = dueDateColor ?? colors.text.secondary;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: colors.background.goalCard,
        borderWidth: 1,
        borderColor: colors.border.warmSubtle,
        borderRadius: 16,
        padding: 18,
        opacity: pressed ? 0.96 : 1,
      })}
    >
      {/* Ring + category/title */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flexShrink: 0 }}>
          <ProgressRing
            progress={progress}
            size={56}
            strokeWidth={5}
            color={ringColor}
            variant="warm"
          />
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ marginBottom: 7 }}>
            <Badge label={category} variant="category" />
          </View>
          <GoalTitleRow
            title={title}
            variant="goal-title"
            numberOfLines={2}
            iconSize={16}
            iconStyle={{ marginTop: 0 }}
          />
        </View>
      </View>

      {/* Footer: activity line + due date */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 14,
        }}
      >
        <Typography variant="hint" numberOfLines={1}>
          {activityLabel ?? ''}
        </Typography>
        <Typography variant="hint" style={{ color: resolvedDueDateColor }}>
          {dueDateLabel ?? ''}
        </Typography>
      </View>
    </Pressable>
  );
}
