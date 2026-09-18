import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Card } from '@/components/ui/Card';
import type { TodayCarouselGoal } from '@/components/ui/TodayCarousel';
import { Typography } from '@/components/ui/Typography';
import { RADIUS, SPACE } from '@/constants/design';
import { useThemeColors } from '@/store/uiStore';
import { getUpcomingGoalSteps } from '../../goals-workspace';
import { goalWorkspaceHref } from '../../navigation';

function nextStepDateLabel(date: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(date);
  due.setHours(0, 0, 0, 0);
  const days = Math.round((due.getTime() - today.getTime()) / 86_400_000);

  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days > 1 && days < 7) return `In ${days} days`;
  if (days === -1) return '1 day overdue';
  if (days < 0) return `${Math.abs(days)} days overdue`;
  return new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short' }).format(date);
}

export function NextStepPanel({ goals }: { goals: TodayCarouselGoal[] }) {
  const colors = useThemeColors();
  const steps = getUpcomingGoalSteps(goals).slice(0, 3);

  return (
    <Card
      elevation="sm"
      padding="spacious"
      style={{ borderWidth: 0, overflow: 'hidden' }}
    >
      <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.lg }}>
        <View
          style={{
            alignItems: 'center',
            backgroundColor: colors.background.selectedRow,
            borderRadius: RADIUS.round,
            height: 36,
            justifyContent: 'center',
            width: 36,
          }}
        >
          <Ionicons color={colors.text.accent} name="navigate-outline" size={18} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Typography variant="eyebrow" style={{ color: colors.text.primary, fontSize: 12 }}>
            Next Step
          </Typography>
          <Typography variant="caption" style={{ color: colors.text.secondary, marginTop: SPACE.xs }}>
            What&apos;s coming up across your goals
          </Typography>
        </View>
      </View>

      {steps.length ? (
        <View style={{ gap: SPACE.sm, marginTop: SPACE.xl }}>
          {steps.map((step) => (
            <Pressable
              accessibilityHint="Opens this goal"
              accessibilityLabel={`${step.milestone.title}, ${nextStepDateLabel(step.dueDate)}`}
              accessibilityRole="button"
              key={step.milestone.id}
              onPress={() => router.push(goalWorkspaceHref(step.goalId) as never)}
              style={({ hovered, pressed }) => ({
                alignItems: 'center',
                backgroundColor: hovered || pressed ? colors.background.selectedRow : colors.background.subtle,
                borderRadius: RADIUS.md,
                flexDirection: 'row',
                gap: SPACE.lg,
                minHeight: 62,
                opacity: pressed ? 0.75 : 1,
                paddingHorizontal: SPACE.lg,
                paddingVertical: SPACE.md,
              })}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <Typography ellipsizeMode="tail" numberOfLines={1} variant="emphasis-sm">
                  {step.milestone.title}
                </Typography>
                <Typography
                  ellipsizeMode="tail"
                  numberOfLines={1}
                  variant="caption"
                  style={{ color: colors.text.secondary, marginTop: SPACE.xs }}
                >
                  {step.goalTitle}
                </Typography>
              </View>
              <View style={{ alignItems: 'flex-end', gap: SPACE.xs }}>
                <Typography variant="caption" style={{ color: colors.text.accent }}>
                  {nextStepDateLabel(step.dueDate)}
                </Typography>
                <Ionicons color={colors.text.muted} name="chevron-forward" size={15} />
              </View>
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={{ marginTop: SPACE.xl }}>
          <Typography variant="body">No dated next step yet.</Typography>
          <Typography variant="caption" style={{ color: colors.text.secondary, marginTop: SPACE.xs }}>
            Add a milestone and give it or its Goal a date to create a reminder.
          </Typography>
        </View>
      )}
    </Card>
  );
}
