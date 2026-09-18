import { View } from 'react-native';
import { BrandIcon } from '@/components/ui/BrandIcon';
import { Card } from '@/components/ui/Card';
import type { TodayCarouselGoal } from '@/components/ui/TodayCarousel';
import { Typography } from '@/components/ui/Typography';
import { SPACE } from '@/constants/design';
import { useThemeColors } from '@/store/uiStore';
import type { WeeklyTaskCountsByGoal } from '../../services/weekly-task-count-service';
import { NextStepPanel } from './NextStepPanel';
import { TodayFocusSummary } from './TodayFocusSummary';

/**
 * Home's Today's Focus cluster: the priority summary plus the cross-goal Next
 * Step panel, with its own loading state. Self-contained so the dashboard route
 * only has to pass data — the goal-derived signals (weeklyTaskCounts, ordering)
 * come from `useHomeSummary`, and `isLoading` reflects the goal list load.
 */
export function TodayFocus({
  goals,
  weeklyTaskCounts,
  isLoading,
}: {
  goals: TodayCarouselGoal[];
  weeklyTaskCounts: WeeklyTaskCountsByGoal;
  isLoading: boolean;
}) {
  if (isLoading) return <TodayFocusLoading />;

  return (
    <View style={{ gap: SPACE['3xl'] }}>
      <TodayFocusSummary goals={goals} weeklyTaskCounts={weeklyTaskCounts} />
      <NextStepPanel goals={goals} />
    </View>
  );
}

function TodayFocusLoading() {
  const colors = useThemeColors();
  return (
    <Card elevation="md" padding="spacious" style={{ borderWidth: 0, minHeight: 180 }}>
      <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.lg }}>
        <BrandIcon name="today" size={22} tintColor={colors.accent.primary} />
        <Typography variant="eyebrow" style={{ color: colors.text.primary, fontSize: 12 }}>
          Today&apos;s Focus
        </Typography>
      </View>
      <Typography variant="meta" style={{ color: colors.text.muted, marginTop: SPACE['3xl'] }}>
        Loading your priorities…
      </Typography>
    </Card>
  );
}
