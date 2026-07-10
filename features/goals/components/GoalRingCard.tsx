import { View, Pressable } from 'react-native';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { Badge } from '@/components/ui/Badge';
import { Typography } from '@/components/ui/Typography';
import { LIGHT_THEME } from '@/constants/colors';

interface GoalRingCardProps {
  title: string;
  /** Category label shown in the chip (e.g. "Fitness"). */
  category: string;
  /**
   * 0–100, drives the ring fill and centered percentage. Caller resolves the
   * meaning: for goals with a deadline this is typically time-elapsed toward
   * the deadline (see features/goals/utils/ringProgress.ts), falling back to
   * measurable-completion progress when there's no deadline.
   */
  progress: number;
  /** Goal's category/theme accent (from GOAL_THEMES) — the ring's progress stroke. */
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
  dueDateColor = LIGHT_THEME.text.secondary,
  onPress,
}: GoalRingCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: LIGHT_THEME.background.goalCard,
        borderWidth: 1,
        borderColor: LIGHT_THEME.border.warmSubtle,
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
            color={accentColor}
            variant="warm"
          />
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ marginBottom: 7 }}>
            <Badge label={category} variant="category" />
          </View>
          <Typography variant="goal-title" numberOfLines={2}>
            {title}
          </Typography>
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
        <Typography variant="hint" style={{ color: dueDateColor }}>
          {dueDateLabel ?? ''}
        </Typography>
      </View>
    </Pressable>
  );
}
