import { useMemo, useState } from 'react';
import {
  Pressable,
  View,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import { AuthenticatedPageShell } from '@/components/layout/AuthenticatedPageShell';
import { FeaturePageHeader } from '@/components/layout/FeaturePageHeader';
import { BrandIcon } from '@/components/ui/BrandIcon';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Typography } from '@/components/ui/Typography';
import { SPACE } from '@/constants/design';
import { GoalEchoAnalysisCard } from '@/features/goals/components/GoalEchoAnalysisCard';
import { useGoals } from '@/features/goals/hooks/useGoals';
import {
  MomentumTrendChart,
} from '@/features/momentum/components/MomentumTrendChart';
import { useMomentumHomeSummary } from '@/features/momentum/hooks/useMomentumHomeSummary';
import type { MomentumHistoryPoint } from '@/features/momentum/types';
import { useThemeColors } from '@/store/uiStore';

type TimeRange = '7D' | '30D' | '3M' | '1Y';
type GoalFilter = 'All goals' | 'Building' | 'Active' | 'Paused' | 'Limited';
type ActivityFilter = 'All' | 'Progress' | 'Entries' | 'Changes';

const RANGE_DAYS: Record<TimeRange, number> = {
  '7D': 7,
  '30D': 30,
  '3M': 92,
  '1Y': 366,
};

function historyForRange(
  history: readonly MomentumHistoryPoint[],
  range: TimeRange,
): MomentumHistoryPoint[] {
  const cutoff = Date.now() - RANGE_DAYS[range] * 24 * 60 * 60 * 1000;
  return history.filter((point) => Date.parse(`${point.periodEnd}T23:59:59Z`) >= cutoff);
}

function weeklyLabel(point: MomentumHistoryPoint): string {
  if (point.periodState === 'provisional') return 'This week · provisional';
  const formatter = new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
  const start = formatter.format(new Date(`${point.periodStart}T00:00:00Z`));
  const end = formatter.format(new Date(`${point.periodEnd}T00:00:00Z`));
  return `${start}–${end} · closed`;
}

function momentumChange(value: number | null): string | null {
  if (value === null) return null;
  const rounded = Math.round(value * 100) / 100;
  if (Math.abs(rounded) < 0.01) return 'No change this week';
  return `${rounded > 0 ? '+' : ''}${rounded.toFixed(2)} this week`;
}

function statusLabel(status: string | null | undefined): string {
  if (!status) return 'Unavailable';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

const COMPONENTS = [
  { key: 'portfolioProgress' as const, label: 'Portfolio progress', icon: 'trending-up-outline' as const },
  { key: 'milestoneVelocity' as const, label: 'Milestone velocity', icon: 'flag-outline' as const },
  { key: 'growthCadence' as const, label: 'Growth cadence', icon: 'pulse-outline' as const },
  { key: 'sustainedGrowth' as const, label: 'Sustained growth', icon: 'leaf-outline' as const },
  { key: 'portfolioCoverage' as const, label: 'Portfolio coverage', icon: 'layers-outline' as const },
];

function SectionHeading({
  title,
  copy,
}: {
  title: string;
  copy?: string;
}) {
  const colors = useThemeColors();
  return (
    <View style={{ gap: SPACE.sm, marginBottom: SPACE.xl }}>
      <View style={{ alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md }}>
        <Typography accessibilityRole="header" variant="heading" style={{ fontSize: 20 }}>
          {title}
        </Typography>
      </View>
      {copy ? (
        <Typography variant="caption" style={{ color: colors.text.secondary, lineHeight: 19 }}>
          {copy}
        </Typography>
      ) : null}
    </View>
  );
}

function FilterPill({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  const colors = useThemeColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: active ? colors.background.selectedRow : colors.background.card,
        borderColor: active ? colors.border.accent : colors.border.warm,
        borderRadius: 999,
        borderWidth: 1,
        opacity: pressed ? 0.6 : 1,
        paddingHorizontal: 12,
        paddingVertical: 7,
      })}
    >
      <Typography variant="label" style={{ color: active ? colors.text.accent : colors.text.secondary }}>
        {label}
      </Typography>
    </Pressable>
  );
}

export default function MomentumScreen() {
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ goalId?: string | string[] }>();
  const requestedGoalId = Array.isArray(params.goalId) ? params.goalId[0] : params.goalId;
  const { goals, isLoading: goalsLoading } = useGoals();
  const momentum = useMomentumHomeSummary();
  const [range, setRange] = useState<TimeRange>('30D');
  const [goalFilter, setGoalFilter] = useState<GoalFilter>('All goals');
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('All');
  const [infoOpen, setInfoOpen] = useState(false);
  const twoColumn = width >= 1000;

  const activeGoals = useMemo(
    () => goals.filter((goal) => goal.status === 'active'),
    [goals],
  );
  const visibleGoals = useMemo(
    () => activeGoals.filter((goal) => {
      if (goalFilter === 'All goals') return true;
      const status = momentum.summary?.goals.find((item) => item.goalId === goal.id)?.status;
      return status === goalFilter.toLowerCase();
    }),
    [activeGoals, goalFilter, momentum.summary?.goals],
  );
  const visibleHistory = useMemo(
    () => historyForRange(momentum.summary?.history ?? [], range),
    [momentum.summary?.history, range],
  );
  const historyValues = visibleHistory.map((point) => point.value);
  const historyLabels = visibleHistory.map(weeklyLabel);
  const currentChange = momentumChange(momentum.summary?.weeklyChange ?? null);

  return (
    <AuthenticatedPageShell>
      <View style={{ minWidth: 0 }}>
          <View style={{ marginBottom: SPACE['4xl'] }}>
            <FeaturePageHeader
              badge={(
                <Typography
                  variant="label"
                  style={{ color: colors.text.secondary, fontWeight: '400' }}
                >
                  (Version 1.1)
                </Typography>
              )}
              description="Understand what is moving forward, what is changing, and where your attention may help."
              icon={<BrandIcon name="momentum" size={24} color={colors.accent.primary} />}
              title="Momentum"
            />
          </View>

          <View style={{ gap: SPACE['4xl'] }}>
            <View>
              <SectionHeading title="Ohara Momentum overview" />
              <Card padding="spacious" elevated>
                <View
                  style={{
                    alignItems: width < 720 ? 'flex-start' : 'center',
                    flexDirection: width < 720 ? 'column' : 'row',
                    gap: 12,
                    justifyContent: 'space-between',
                  }}
                >
                  <View style={{ gap: 8 }}>
                    <View style={{ alignItems: 'center', flexDirection: 'row', gap: 8 }}>
                      <BrandIcon name="momentum" size={18} color={colors.accent.primary} />
                      <Typography variant="eyebrow" style={{ color: colors.text.accent }}>
                        Ohara Momentum
                      </Typography>
                    </View>
                    <View style={{ alignItems: 'baseline', flexDirection: 'row', gap: 10 }}>
                      <Typography variant="heading">
                        {momentum.isLoading ? 'Calculating…' : statusLabel(momentum.summary?.status)}
                      </Typography>
                      {!momentum.isLoading && typeof momentum.summary?.currentValue === 'number' ? (
                        <Typography variant="label" style={{ color: colors.text.accent }}>
                          {momentum.summary?.currentValue?.toFixed(2)}
                          {currentChange ? ` · ${currentChange}` : ''}
                        </Typography>
                      ) : null}
                    </View>
                    {momentum.summary ? (
                      <Typography variant="caption" style={{ color: colors.text.secondary }}>
                        This week · {momentum.summary.periodState}
                      </Typography>
                    ) : null}
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setInfoOpen(true)}
                    style={({ pressed }) => ({
                      alignItems: 'center',
                      flexDirection: 'row',
                      gap: 6,
                      opacity: pressed ? 0.55 : 1,
                      paddingVertical: 5,
                    })}
                  >
                    <Ionicons color={colors.text.accent} name="information-circle-outline" size={17} />
                    <Typography variant="emphasis-sm" style={{ color: colors.text.accent }}>
                      How Momentum works
                    </Typography>
                  </Pressable>
                </View>

                <View style={{ marginTop: 18, minHeight: width < 720 ? 250 : 330 }}>
                  {momentum.isLoading ? (
                    <View style={{ alignItems: 'center', flex: 1, justifyContent: 'center' }}>
                      <Typography variant="description">Loading authoritative Momentum history…</Typography>
                    </View>
                  ) : momentum.error ? (
                    <View style={{ alignItems: 'center', flex: 1, gap: SPACE.lg, justifyContent: 'center' }}>
                      <Typography accessibilityRole="alert" variant="description">
                        {momentum.error}
                      </Typography>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => { void momentum.refresh(); }}
                        style={({ pressed }) => ({ minHeight: 44, opacity: pressed ? 0.6 : 1, padding: SPACE.lg })}
                      >
                        <Typography variant="emphasis-sm" style={{ color: colors.text.accent }}>Try again</Typography>
                      </Pressable>
                    </View>
                  ) : visibleHistory.length ? (
                    <MomentumTrendChart
                      height={width < 720 ? 250 : 330}
                      points={historyValues}
                      showAxes
                      yDomainMax={100}
                      xAxisLabel="Week"
                      xLabels={historyLabels}
                    />
                  ) : (
                    <View style={{ alignItems: 'center', flex: 1, justifyContent: 'center' }}>
                      <Typography variant="title">No Momentum history in this range</Typography>
                      <Typography variant="description" style={{ marginTop: SPACE.md, textAlign: 'center' }}>
                        Choose a wider range, or keep taking meaningful action to form your trend.
                      </Typography>
                    </View>
                  )}
                </View>
                {!momentum.isLoading && !momentum.error && visibleHistory.length === 1 ? (
                  <Typography
                    variant="description"
                    style={{ color: colors.text.secondary, marginTop: SPACE.md }}
                  >
                    One Momentum period is available. The current week remains provisional until local week close.
                  </Typography>
                ) : null}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                  {(Object.keys(RANGE_DAYS) as TimeRange[]).map((item) => (
                    <FilterPill
                      active={range === item}
                      key={item}
                      label={item}
                      onPress={() => setRange(item)}
                    />
                  ))}
                </View>
                <View
                  style={{
                    backgroundColor: colors.background.subtle,
                    borderRadius: 12,
                    marginTop: 18,
                    padding: 14,
                  }}
                >
                  <Typography variant="caption" style={{ color: colors.text.secondary, lineHeight: 19 }}>
                    Closed points are immutable weekly snapshots. The newest point is this week&apos;s live provisional calculation.
                  </Typography>
                </View>
              </Card>
            </View>

            <View>
              <SectionHeading
                copy="Live current-week portfolio components. Unavailable components are reweighted rather than fabricated."
                title="Momentum components"
              />
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                {COMPONENTS.map((component) => (
                  <Card
                    key={component.key}
                    padding="compact"
                    style={{
                      flexBasis: width >= 1180 ? '23%' : width >= 640 ? '47%' : '100%',
                      flexGrow: 1,
                    }}
                  >
                    <View style={{ alignItems: 'center', flexDirection: 'row', gap: 10 }}>
                      <View
                        style={{
                          alignItems: 'center',
                          backgroundColor: colors.background.selectedRow,
                          borderRadius: 9,
                          height: 34,
                          justifyContent: 'center',
                          width: 34,
                        }}
                      >
                        <Ionicons color={colors.text.accent} name={component.icon} size={18} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Typography variant="label">{component.label}</Typography>
                        <Typography variant="caption" style={{ color: colors.text.accent, marginTop: 2 }}>
                          {typeof momentum.summary?.components[component.key] === 'number'
                            ? `${Math.round(momentum.summary.components[component.key]!)} / 100`
                            : 'Unavailable'}
                        </Typography>
                      </View>
                    </View>
                  </Card>
                ))}
              </View>
            </View>

            <View>
              <SectionHeading
                copy="Each active goal uses closed history plus a live current-week provisional calculation."
                title="Goal Momentum"
              />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                {(['All goals', 'Building', 'Active', 'Paused', 'Limited'] as GoalFilter[]).map((filter) => (
                  <FilterPill
                    active={goalFilter === filter}
                    key={filter}
                    label={filter}
                    onPress={() => setGoalFilter(filter)}
                  />
                ))}
              </View>
              {goalsLoading ? (
                <Typography variant="hint">Loading active goals…</Typography>
              ) : visibleGoals.length ? (
                <View style={{ gap: 12 }}>
                  {visibleGoals.map((goal) => (
                    <View key={goal.id}>
                      <GoalEchoAnalysisCard
                        category={goal.category}
                        goalId={goal.id}
                        goalTitle={goal.title}
                        highlighted={requestedGoalId === goal.id}
                        navigationAction="goal"
                        presentation="row"
                      />
                    </View>
                  ))}
                </View>
              ) : (
                <Card padding="compact">
                  <Typography variant="hint">
                    {activeGoals.length
                      ? 'No active goals match this Momentum status.'
                      : 'Active goals will appear here after a Momentum V1.1 calculation.'}
                  </Typography>
                </Card>
              )}
            </View>

            <View style={{ flexDirection: twoColumn ? 'row' : 'column', gap: 16 }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <SectionHeading title="Activity" />
                <Card>
                  <View style={{ alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {(['All', 'Progress', 'Entries', 'Changes'] as ActivityFilter[]).map((filter) => (
                      <FilterPill
                        active={activityFilter === filter}
                        key={filter}
                        label={filter}
                        onPress={() => setActivityFilter(filter)}
                      />
                    ))}
                  </View>
                  <View style={{ marginTop: 22 }}>
                    <Typography variant="title">Activity will appear here</Typography>
                    <Typography
                      variant="caption"
                      style={{ color: colors.text.secondary, lineHeight: 19, marginTop: 6 }}
                    >
                      A complete cross-goal activity stream is not available yet. No sample events are
                      mixed with your real goal data.
                    </Typography>
                  </View>
                </Card>
              </View>

              <View style={{ flex: 1, minWidth: 0 }}>
                <SectionHeading title="Why it changed" />
                <Card>
                  {momentum.summary?.reasons.length ? (
                    <View style={{ gap: 12 }}>
                      {momentum.summary.reasons.map((reason) => (
                        <View key={reason.code} style={{ alignItems: 'flex-start', flexDirection: 'row', gap: 9 }}>
                          <Ionicons color={colors.text.accent} name="sparkles-outline" size={15} />
                          <Typography variant="caption" style={{ color: colors.text.primary, flex: 1, lineHeight: 19 }}>{reason.message}</Typography>
                        </View>
                      ))}
                    </View>
                  ) : <Typography variant="hint">No reason codes are available for this period.</Typography>}
                </Card>
              </View>
            </View>

            <View style={{ alignItems: 'flex-start', gap: 8 }}>
              <Typography accessibilityRole="header" variant="heading" style={{ fontSize: 18 }}>
                How Momentum works
              </Typography>
              <Typography variant="caption" style={{ color: colors.text.secondary, lineHeight: 19, maxWidth: 760 }}>
                Momentum is intended as supportive guidance across active goals—not a judgment, grade, or comparison.
              </Typography>
              <Pressable
                accessibilityRole="button"
                onPress={() => setInfoOpen(true)}
                style={({ pressed }) => ({ opacity: pressed ? 0.55 : 1, paddingVertical: 5 })}
              >
                <Typography variant="emphasis-sm" style={{ color: colors.text.accent }}>
                  Read how Momentum works →
                </Typography>
              </Pressable>
            </View>
          </View>
      </View>

      <Modal
        closeOnBackdropPress
        contentStyle={{ maxWidth: 620 }}
        onClose={() => setInfoOpen(false)}
        visible={infoOpen}
      >
        <Typography accessibilityRole="header" variant="heading">
          How Momentum works
        </Typography>
        <View style={{ gap: 11, marginTop: 16 }}>
          {[
            'Ohara Momentum reflects movement across active goals.',
            'Goal Momentum combines Consistency, Progress, Reflection, and Initiative on a bounded 0–100 scale.',
            'OHARA Momentum independently represents portfolio progress, milestone velocity, growth cadence, sustained growth, and coverage.',
            'True inactivity pauses Momentum; missed commitments remain part of the active calculation.',
            'Difficulty is deterministic and category-relative, but never weights one category against another in OHARA Momentum.',
            'Momentum is guidance, not a judgment or grade.',
            'Closed history remains authoritative and immutable; this week is recalculated provisionally from the latest closed baseline.',
          ].map((item) => (
            <View key={item} style={{ alignItems: 'flex-start', flexDirection: 'row', gap: 9 }}>
              <View
                style={{
                  backgroundColor: colors.accent.primary,
                  borderRadius: 4,
                  height: 7,
                  marginTop: 6,
                  width: 7,
                }}
              />
              <Typography variant="caption" style={{ color: colors.text.secondary, flex: 1, lineHeight: 19 }}>
                {item}
              </Typography>
            </View>
          ))}
        </View>
      </Modal>
    </AuthenticatedPageShell>
  );
}
