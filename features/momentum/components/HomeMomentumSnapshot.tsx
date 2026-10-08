import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { BrandIcon } from '@/components/ui/BrandIcon';
import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { RADIUS, SPACE } from '@/constants/design';
import { useThemeColors } from '@/store/uiStore';
import type { GoalWithDetails } from '@/features/goals/types';
import type { MomentumHomeSummary } from '../types';
import { selectHomeGoalMomentum } from '../home-snapshot';

function changeLabel(change: number | null): string {
  if (change === null) return 'No weekly comparison yet';
  if (Math.abs(change) < 0.05) return 'No change this week';
  return `${change > 0 ? '+' : ''}${Math.round(change * 10) / 10} this week`;
}

export function HomeMomentumSnapshot({
  error,
  goals,
  isLoading,
  summary,
}: {
  error: string | null;
  goals: readonly Pick<GoalWithDetails, 'id' | 'status' | 'title'>[];
  isLoading: boolean;
  summary: MomentumHomeSummary | null;
}) {
  const colors = useThemeColors();
  const goalMomentum = selectHomeGoalMomentum(summary, goals);
  const current = summary?.displayedValue ?? summary?.currentValue ?? null;

  return (
    <Card accessibilityLabel="Momentum Snapshot card" elevation="sm" padding="spacious">
      <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.md }}>
        <View style={{ alignItems: 'center', backgroundColor: colors.background.selectedRow, borderRadius: RADIUS.round, height: 38, justifyContent: 'center', width: 38 }}>
          <BrandIcon color={colors.text.accent} name="momentum" size={19} />
        </View>
        <View style={{ flex: 1 }}>
          <Typography variant="eyebrow">Momentum Snapshot</Typography>
          <Typography variant="caption">How your progress is moving</Typography>
        </View>
      </View>

      {isLoading && !summary ? <Typography variant="body-small" style={{ marginTop: SPACE.xl }}>Loading Momentum…</Typography> : null}
      {!isLoading && current === null ? <Typography variant="body-small" style={{ marginTop: SPACE.xl }}>{error ? 'Momentum is temporarily unavailable.' : 'Momentum is building from your activity.'}</Typography> : null}
      {current !== null ? <>
        <View style={{ alignItems: 'flex-end', flexDirection: 'row', gap: SPACE.md, marginTop: SPACE.xl }}>
          <Typography variant="heading">{Math.round(current)}</Typography>
          <Typography variant="caption" style={{ color: colors.text.accent, paddingBottom: SPACE.xs }}>{changeLabel(summary?.weeklyChange ?? null)}</Typography>
        </View>
        {goalMomentum.length ? <View style={{ gap: SPACE.sm, marginTop: SPACE.xl }}>
          {goalMomentum.map((goal) => <View key={goal.goalId} style={{ alignItems: 'center', borderTopColor: colors.border.divider, borderTopWidth: 1, flexDirection: 'row', gap: SPACE.md, paddingTop: SPACE.sm }}>
            <Typography numberOfLines={1} variant="body-small" style={{ flex: 1 }}>{goal.title}</Typography>
            <Typography variant="emphasis-sm">{Math.round(goal.displayedValue)}</Typography>
            <Typography variant="caption" style={{ color: colors.text.secondary, minWidth: 86, textAlign: 'right' }}>{changeLabel(goal.weeklyChange)}</Typography>
          </View>)}
        </View> : null}
      </> : null}
      <Pressable accessibilityRole="link" onPress={() => router.push('/(app)/momentum')} style={{ alignSelf: 'flex-start', justifyContent: 'center', marginTop: SPACE.lg, minHeight: 40 }}>
        <Typography variant="emphasis-sm" style={{ color: colors.text.accent }}>View Momentum →</Typography>
      </Pressable>
    </Card>
  );
}
