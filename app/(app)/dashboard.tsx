import { useEffect, useMemo, useRef, useState, type ComponentProps } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  Pressable,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { BrandIcon } from '@/components/ui/BrandIcon';
import { Card } from '@/components/ui/Card';
import { ProgressRing } from '@/components/ui/ProgressRing';
import type { TodayCarouselGoal } from '@/components/ui/TodayCarousel';
import { Toast } from '@/components/ui/Toast';
import { Typography } from '@/components/ui/Typography';
import { useGoals } from '@/features/goals/hooks/useGoals';
import { goalWorkspaceHref } from '@/features/goals/navigation';
import { useSession } from '@/features/auth/hooks/useSession';
import { useLatestAction } from '@/features/actions/hooks/useLatestAction';
import { useDashboardEntryPreviews } from '@/features/entries/hooks/useDashboardEntryPreviews';
import type { DashboardEntryPreview } from '@/features/entries/dashboard-entry-previews';
import { useProfileStore } from '@/features/profile/store';
import { useProjectStore } from '@/features/projects/store';
import { GoalRingGrid } from '@/features/goals/components/GoalRingGrid';
import { GoalCard } from '@/features/goals/components/GoalCard';
import { GoalEchoAnalysisCard } from '@/features/goals/components/GoalEchoAnalysisCard';
import { MomentumTrendChart } from '@/features/momentum/components/MomentumTrendChart';
import { useMomentumHomeSummary } from '@/features/momentum/hooks/useMomentumHomeSummary';
import type { MomentumHomeSummary } from '@/features/momentum/types';
import { ProjectGoalRow } from '@/features/goals/components/ProjectGoalRow';
import { GoalTitleRow } from '@/features/goals/components/GoalTitleRow';
import {
  orderActiveGoals,
  resolveActiveGoalProjectTitles,
  selectActiveGoals,
  type ReflectionTimestampsByGoalId,
} from '@/features/goals/active-goal-selectors';
import { fetchActiveGoalReflectionTimestamps } from '@/features/goals/services/active-goal-reflection-service';
import { fetchDashboardGoalActivity } from '@/features/goals/services/dashboard-goal-activity-service';
import type {
  DashboardGoalActivity,
  GoalActivityByGoalId,
} from '@/features/goals/dashboard-goal-activity';
import { CreateProjectModal } from '@/features/projects/components/CreateProjectModal';
import type { Project } from '@/features/projects/types';
import { FEATURES } from '@/constants/features';
import {
  DASHBOARD_DRAFTS_ROUTE,
  DASHBOARD_DRAFT_SAVED_PARAM,
  DASHBOARD_GOAL_FILTER_PARAM,
} from '@/lib/navigation/dashboard';
import { useThemeColors, useUIStore } from '@/store/uiStore';
import { authedFetch } from '@/lib/api/client';
import { formatRelativeTime } from '@/lib/utils/relativeTime';
import type { AiResponse } from '@/lib/ai/contracts';
import type { GoalWithDetails } from '@/features/goals/types';
import type { ActionLog } from '@/features/actions/types';
import { RADIUS, SPACE } from '@/constants/design';
import { getCategoryAccentTheme } from '@/constants/themes';
import { startPerformanceTimer } from '@/lib/diagnostics/performance';

// --- Helpers ---

function displayNameFromEmail(email: string | undefined): string | null {
  if (!email) return null;
  const local = email.split('@')[0];
  if (!local) return null;
  return local.charAt(0).toUpperCase() + local.slice(1);
}

function displayNameFromMetadata(metadata: Record<string, unknown> | undefined): string | null {
  if (!metadata) return null;
  const value = metadata.display_name ?? metadata.full_name ?? metadata.name ?? metadata.username;
  if (typeof value !== 'string' || !value.trim()) return null;
  return value
    .trim()
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatCategoryLabel(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

function DashboardGreeting({
  displayName,
  momentumLoading,
  weeklyStreak,
}: {
  displayName: string | null;
  momentumLoading: boolean;
  weeklyStreak: number | null;
}) {
  const colors = useThemeColors();
  const name = displayName ?? 'there';
  const greetingName = name.replace(/[._-]+/g, ' ').replace(/\s+/g, ' ').trim().split(' ')[0];

  return (
    <View style={{ justifyContent: 'center', minHeight: 132, paddingHorizontal: SPACE.xl }}>
      <Typography
        variant="body"
        style={{ color: colors.text.secondary, fontSize: 18, lineHeight: 26 }}
      >
        Welcome back,
      </Typography>
      <Typography
        variant="greeting"
        style={{ fontSize: 46, fontWeight: '600', letterSpacing: -1.5, lineHeight: 54 }}
      >
        {greetingName}.
      </Typography>
      <Typography
        variant="body"
        style={{ color: colors.text.secondary, fontSize: 16, lineHeight: 24, marginTop: SPACE.xs }}
      >
        {momentumLoading ? (
          'Your weekly rhythm is loading…'
        ) : weeklyStreak && weeklyStreak > 0 ? (
          <>
            You&apos;ve shown up for{' '}
            <Text style={{ color: colors.text.accent, fontWeight: '500' }}>{weeklyStreak}</Text>
            {' '}{weeklyStreak === 1 ? 'consecutive week' : 'consecutive weeks'}.
          </>
        ) : (
          'This week is ready for your next meaningful step.'
        )}
      </Typography>
    </View>
  );
}

function DashboardCreateButton({
  label,
  onPress,
}: {
  label: 'New Project' | 'New Goal' | 'New Note' | 'New Reflection';
  onPress: () => void;
}) {
  const colors = useThemeColors();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor: colors.background.selectedRow,
        borderColor: colors.border.subtle,
        borderRadius: RADIUS.round,
        borderWidth: 1,
        flexDirection: 'row',
        minHeight: 36,
        opacity: pressed ? 0.72 : 1,
        paddingHorizontal: SPACE.lg,
        paddingVertical: SPACE.sm,
      })}
    >
      <Typography
        variant="emphasis-sm"
        style={{ color: colors.text.accent, fontSize: 12 }}
      >
        + {label}
      </Typography>
    </Pressable>
  );
}

function TodayFocusSummary({ goals }: { goals: TodayCarouselGoal[] }) {
  const colors = useThemeColors();
  const darkMode = useUIStore((state) => state.themeMode === 'dark');
  const { width } = useWindowDimensions();
  const stackedMetadata = width < 1440;
  const visibleGoals = goals.slice(0, 3);

  return (
    <Card
      elevation="md"
      padding="spacious"
      style={{ borderWidth: 0, flex: 1, minHeight: 286, overflow: 'hidden' }}
    >
      <View
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginBottom: SPACE['3xl'],
        }}
      >
        <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.lg }}>
          <BrandIcon name="today" size={22} tintColor={colors.accent.primary} />
          <Typography variant="eyebrow" style={{ color: colors.text.primary, fontSize: 12 }}>
            Today&apos;s Focus
          </Typography>
        </View>
        <View
          style={{
            backgroundColor: colors.background.selectedRow,
            borderRadius: RADIUS.round,
            minHeight: 32,
            justifyContent: 'center',
            paddingHorizontal: SPACE.lg,
          }}
        >
          <Typography variant="caption" style={{ color: colors.text.accent }}>
            {visibleGoals.length} {visibleGoals.length === 1 ? 'priority' : 'priorities'}
          </Typography>
        </View>
      </View>

      {visibleGoals.length ? (
        <View style={{ gap: SPACE['3xl'] }}>
          {visibleGoals.map((goal) => {
            const categoryTheme = getCategoryAccentTheme(goal.category);
            return (
              <Pressable
              key={goal.id}
              accessibilityHint="Opens this goal"
              accessibilityLabel={`Open ${goal.title}`}
              accessibilityRole="button"
              onPress={() => router.push(goalWorkspaceHref(goal.id) as never)}
              style={({ pressed }) => ({
                alignItems: 'center',
                backgroundColor: pressed ? colors.background.selectedRow : 'transparent',
                borderRadius: RADIUS.sm,
                flexDirection: 'row',
                minHeight: stackedMetadata ? 54 : 44,
                paddingHorizontal: 0,
              })}
            >
              <View
                style={{
                  backgroundColor: colors.accent.primary,
                  borderRadius: RADIUS.round,
                  height: 10,
                  marginRight: SPACE.xl,
                  width: 10,
                }}
              />
              <View
                style={{
                  alignItems: stackedMetadata ? 'flex-start' : 'center',
                  flex: 1,
                  flexDirection: stackedMetadata ? 'column' : 'row',
                  minWidth: 0,
                }}
              >
                <Typography
                  ellipsizeMode="tail"
                  numberOfLines={1}
                  variant="content"
                  style={{ flexShrink: 1, fontSize: 15, fontWeight: '500' }}
                >
                  {goal.title}
                </Typography>
                <View
                  style={{
                    backgroundColor: darkMode ? colors.background.input : categoryTheme.tint,
                    borderRadius: RADIUS.round,
                    marginLeft: stackedMetadata ? 0 : SPACE.lg,
                    marginTop: stackedMetadata ? SPACE.xs : 0,
                    maxWidth: 126,
                    paddingHorizontal: SPACE.lg,
                    paddingVertical: SPACE.xs,
                  }}
                >
                  <Typography
                    ellipsizeMode="tail"
                    numberOfLines={1}
                    variant="caption"
                    style={{ color: darkMode ? categoryTheme.color : categoryTheme.mid, fontSize: 11 }}
                  >
                    {goal.projectTitle ?? formatCategoryLabel(goal.category)}
                  </Typography>
                </View>
              </View>
              <Typography
                variant="caption"
                style={{ color: colors.text.accent, marginLeft: SPACE.lg, minWidth: 32, textAlign: 'right' }}
              >
                {Math.round(goal.progress)}%
              </Typography>
              <View
                style={{
                  alignItems: 'center',
                  backgroundColor: colors.background.subtle,
                  borderRadius: RADIUS.round,
                  height: 32,
                  justifyContent: 'center',
                  marginLeft: SPACE.xl,
                  width: 32,
                }}
              >
                <Ionicons color={colors.text.accent} name="chevron-forward" size={17} />
              </View>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View style={{ flex: 1, justifyContent: 'center', paddingVertical: SPACE['2xl'] }}>
          <Typography variant="meta" style={{ color: colors.text.muted }}>
            No active goals yet.
          </Typography>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/goals/create')}
            style={({ pressed }) => ({ alignSelf: 'flex-start', marginTop: 10, opacity: pressed ? 0.6 : 1 })}
          >
            <Typography variant="emphasis-sm" style={{ color: colors.text.accent }}>
              Create a goal
            </Typography>
          </Pressable>
        </View>
      )}
    </Card>
  );
}

function MomentumMetric({ icon, label, supporting, value }: {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  supporting?: string;
  value: number | null;
}) {
  const colors = useThemeColors();
  return (
    <View style={{
      backgroundColor: colors.background.subtle,
      borderRadius: RADIUS.lg,
      flex: 1,
      minHeight: 116,
      padding: SPACE.xl,
    }}>
      <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.lg }}>
        <Ionicons color={colors.text.accent} name={icon} size={28} />
        <Typography variant="title" style={{ fontSize: 28, fontWeight: '500', lineHeight: 34 }}>
          {value ?? '—'}
        </Typography>
      </View>
      <Typography variant="label" style={{ color: colors.text.primary, marginLeft: 40, marginTop: SPACE.sm }}>
        {label}
      </Typography>
      {supporting ? (
        <Typography variant="caption" style={{ marginLeft: 40, marginTop: 2 }}>{supporting}</Typography>
      ) : null}
    </View>
  );
}

function momentumChangeLabel(summary: MomentumHomeSummary | null): string {
  if (!summary || summary.weeklyChange === null) return 'Unavailable';
  const rounded = Math.round(summary.weeklyChange * 100) / 100;
  if (Math.abs(rounded) < 0.01) return 'No change this week';
  return `${rounded > 0 ? '+' : ''}${rounded} this week`;
}

function momentumValueLabel(summary: MomentumHomeSummary | null): string {
  if (!summary || summary.currentValue === null) return 'Unavailable';
  return `${summary.displayedValue ?? Math.round(summary.currentValue)} / 100`;
}

function momentumStatusLabel(summary: MomentumHomeSummary | null): string {
  const status = summary?.status;
  if (!status) return 'Unavailable';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function MomentumCard({
  error,
  isLoading,
  summary,
}: {
  error: string | null;
  isLoading: boolean;
  summary: MomentumHomeSummary | null;
}) {
  const colors = useThemeColors();
  const [expanded, setExpanded] = useState(false);
  const hasTrend = Boolean(summary && summary.trendPoints.length >= 1);

  return (
    <>
      <Card
        elevation="md"
        padding="none"
        style={{ borderWidth: 0, flex: 1, minHeight: 604, overflow: 'hidden' }}
      >
        <View style={{ flex: 1, padding: SPACE['3xl'] }}>
          <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.sm }}>
              <BrandIcon name="momentum" size={20} color={colors.accent.primary} />
              <Typography variant="eyebrow" style={{ color: colors.text.primary, fontSize: 12 }}>
                Momentum
              </Typography>
            </View>
            <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.sm }}>
              <View style={{
                alignItems: 'center', backgroundColor: colors.background.input,
                borderRadius: RADIUS.md, height: 44, justifyContent: 'center', paddingHorizontal: SPACE.lg,
              }}>
                <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.md }}>
                  <Typography variant="caption" style={{ color: colors.text.primary }}>This Week</Typography>
                  <Ionicons color={colors.text.secondary} name="chevron-down" size={13} />
                </View>
              </View>
              <Pressable
                accessibilityLabel="Expand Ohara Momentum chart"
                accessibilityRole="button"
                hitSlop={10}
                onPress={() => setExpanded(true)}
                style={({ pressed }) => ({
                  alignItems: 'center',
                  backgroundColor: colors.background.input,
                  borderRadius: RADIUS.md,
                  height: 44,
                  justifyContent: 'center',
                  opacity: pressed ? 0.58 : 1,
                  width: 44,
                })}
              >
                <Ionicons color={colors.text.accent} name="expand-outline" size={17} />
              </Pressable>
            </View>
          </View>

          <View
            style={{
              backgroundColor: colors.border.warmSubtle,
              height: 1,
              marginTop: SPACE.xl,
            }}
          />
          <View style={{ alignItems: 'baseline', flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.lg, marginTop: SPACE['2xl'] }}>
            <Typography variant="title" style={{ fontSize: 28, fontWeight: '500', lineHeight: 36 }}>
              {isLoading ? 'Calculating…' : momentumStatusLabel(summary)}
            </Typography>
            {!isLoading && summary?.currentValue !== null ? (
              <Typography variant="caption" style={{ color: colors.text.accent, fontSize: 13 }}>
                {momentumValueLabel(summary)} · {momentumChangeLabel(summary)}
              </Typography>
            ) : null}
          </View>

          <View style={{ marginTop: SPACE.lg }}>
            {hasTrend && summary ? (
              <MomentumTrendChart height={244} points={summary.trendPoints} xLabels={summary.trendLabels} yDomainMax={100} />
            ) : (
              <View style={{ alignItems: 'center', height: 244, justifyContent: 'center' }}>
                <Typography variant="description" style={{ color: colors.text.secondary }}>
                  {isLoading ? 'Preparing this week’s Momentum…' : error ?? 'Momentum will appear after an authoritative calculation.'}
                </Typography>
              </View>
            )}
          </View>
          <View style={{ flexDirection: 'row', gap: SPACE.lg, marginTop: SPACE.lg }}>
            <MomentumMetric
              icon="flame-outline"
              label="Weekly Streak"
              value={summary?.weeklyStreak ?? null}
            />
            <MomentumMetric
              icon="checkmark-circle-outline"
              label="Tasks Completed"
              supporting="This Week"
              value={summary?.tasksCompletedThisWeek ?? null}
            />
          </View>
          <View style={{ flex: 1, justifyContent: 'flex-end', marginTop: SPACE.lg }}>
            <Pressable
              accessibilityRole="link"
              onPress={() => router.push('/(app)/momentum' as never)}
              style={({ pressed }) => ({
                alignSelf: 'flex-start',
                opacity: pressed ? 0.55 : 1,
                minHeight: 44,
                justifyContent: 'center',
              })}
            >
              <Typography variant="emphasis-sm" style={{ color: colors.text.accent }}>
                See full Momentum →
              </Typography>
            </Pressable>
          </View>
        </View>
      </Card>

      <Modal
        animationType="fade"
        onRequestClose={() => setExpanded(false)}
        transparent
        visible={expanded}
      >
        <View
          style={{
            alignItems: 'center',
            flex: 1,
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <Pressable
            accessibilityLabel="Close expanded Ohara Momentum chart"
            accessibilityRole="button"
            onPress={() => setExpanded(false)}
            style={{
              backgroundColor: colors.effects.overlay,
              bottom: 0,
              left: 0,
              position: 'absolute',
              right: 0,
              top: 0,
            }}
          />
          <View
            style={{
              backgroundColor: colors.background.card,
              borderColor: colors.border.divider,
              borderRadius: 18,
              borderWidth: 1,
              maxWidth: 620,
              padding: 24,
              width: '100%',
            }}
          >
            <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }}>
              <View>
                <Typography variant="eyebrow" style={{ color: colors.text.accent }}>Momentum</Typography>
                <Typography variant="title" style={{ marginTop: 6 }}>
                  {summary?.status ?? 'Unavailable'} · {momentumValueLabel(summary)} · {momentumChangeLabel(summary)}
                </Typography>
              </View>
              <Pressable
                accessibilityLabel="Close"
                accessibilityRole="button"
                onPress={() => setExpanded(false)}
                style={({ pressed }) => ({ opacity: pressed ? 0.55 : 1, padding: 6 })}
              >
                <Ionicons color={colors.text.primary} name="close" size={20} />
              </Pressable>
            </View>
            <View style={{ marginVertical: 20, pointerEvents: 'none' }}>
              {hasTrend && summary ? (
                <MomentumTrendChart
                  height={260}
                  points={summary.trendPoints}
                  showAxes
                  xLabels={summary.trendLabels}
                  yDomainMax={100}
                />
              ) : (
                <Typography variant="description" style={{ color: colors.text.secondary }}>
                  {error ?? 'Momentum is not available yet.'}
                </Typography>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

function resolveGoalActivity(
  goal: GoalWithDetails,
  linkedActivity?: DashboardGoalActivity | null,
): DashboardGoalActivity | null {
  const candidates: DashboardGoalActivity[] = [];
  const completedMilestone = [...goal.milestones]
    .filter((milestone) => milestone.completedAt)
    .sort((a, b) => (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0))[0];

  if (completedMilestone?.completedAt) {
    candidates.push({
      at: completedMilestone.completedAt,
      label: `Completed ${completedMilestone.title}`,
    });
  }
  if (linkedActivity) candidates.push(linkedActivity);
  if (goal.updatedAt.getTime() > goal.createdAt.getTime() + 60_000) {
    candidates.push({ at: goal.updatedAt, label: 'Goal updated' });
  }

  return candidates.sort((a, b) => b.at.getTime() - a.at.getTime())[0] ?? null;
}

function HomeGoalPreview({
  goal,
  linkedActivity,
}: {
  goal: GoalWithDetails;
  linkedActivity?: DashboardGoalActivity | null;
}) {
  const colors = useThemeColors();
  const darkMode = useUIStore((state) => state.themeMode === 'dark');
  const categoryTheme = getCategoryAccentTheme(goal.category);
  const recentActivity = resolveGoalActivity(goal, linkedActivity);
  const nextMilestone = goal.milestones.find((milestone) => !milestone.completedAt);
  const nextTracker = goal.trackers.find((tracker) => (
    tracker.targetValue === null || tracker.currentValue < tracker.targetValue
  ));
  const nextLabel = nextMilestone?.title ?? nextTracker?.title ?? null;
  const nextDate = nextMilestone?.dueDate ?? goal.deadline;
  const hasActivityDetails = Boolean(recentActivity || nextLabel);

  return (
    <Pressable
      accessibilityLabel={`Open ${goal.title}`}
      accessibilityRole="button"
      onPress={() => router.push(goalWorkspaceHref(goal.id) as never)}
      style={({ pressed }) => ({
        backgroundColor: pressed ? colors.background.selectedRow : colors.background.subtle,
        borderColor: colors.border.warmSubtle,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        minHeight: hasActivityDetails ? 218 : 124,
        opacity: pressed ? 0.8 : 1,
        padding: SPACE.xl,
      })}
    >
      <View style={{ alignItems: 'flex-start', flexDirection: 'row', gap: SPACE.xl }}>
        <View
          style={{
            alignItems: 'center',
            backgroundColor: darkMode ? colors.background.input : categoryTheme.tint,
            borderRadius: RADIUS.round,
            height: 48,
            justifyContent: 'center',
            width: 48,
          }}
        >
          <BrandIcon name="goal-mark" size={25} tintColor={categoryTheme.color} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Typography numberOfLines={1} variant="title" style={{ fontSize: 16, fontWeight: '500', lineHeight: 24 }}>
            {goal.title}
          </Typography>
          <Typography variant="caption" style={{ color: colors.text.secondary, marginTop: SPACE.xs }}>
            {formatCategoryLabel(goal.category)}
          </Typography>
          {goal.description ? (
            <Typography ellipsizeMode="tail" numberOfLines={2} variant="description" style={{ color: colors.text.secondary, marginTop: SPACE.sm }}>
              {goal.description}
            </Typography>
          ) : null}
        </View>
        <ProgressRing progress={goal.progress} size={58} strokeWidth={4} variant="warm" />
      </View>
      {hasActivityDetails ? (
        <View
          style={{
            borderTopColor: colors.border.warmSubtle,
            borderTopWidth: 1,
            flexDirection: 'row',
            gap: SPACE.xl,
            marginTop: SPACE.xl,
            paddingTop: SPACE.lg,
          }}
        >
          {recentActivity ? (
            <View style={{ flex: 1 }}>
              <Typography variant="eyebrow" style={{ color: colors.text.accent }}>Recent activity</Typography>
              <Typography numberOfLines={1} variant="description" style={{ color: colors.text.primary, marginTop: SPACE.xs }}>
                {recentActivity.label}
              </Typography>
              <Typography variant="caption" style={{ marginTop: 2 }}>
                {formatRelativeTime(recentActivity.at.toISOString())}
              </Typography>
            </View>
          ) : null}
          {nextLabel ? (
            <View style={{ flex: 1 }}>
              <Typography variant="eyebrow" style={{ color: colors.text.accent }}>Next step</Typography>
              <Typography numberOfLines={1} variant="description" style={{ color: colors.text.primary, marginTop: SPACE.xs }}>
                {nextLabel}
              </Typography>
              {nextDate ? (
                <Typography variant="caption" style={{ marginTop: 2 }}>
                  {formatRelativeTime(nextDate.toISOString())}
                </Typography>
              ) : null}
            </View>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

function HomeGoalsPreview({ goals, goalActivity }: {
  goals: GoalWithDetails[];
  goalActivity: GoalActivityByGoalId;
}) {
  const colors = useThemeColors();
  const visibleGoals = useMemo(
    () => [...goals]
      .sort((a, b) => {
        const activityA = resolveGoalActivity(a, goalActivity[a.id]);
        const activityB = resolveGoalActivity(b, goalActivity[b.id]);
        if (activityA && activityB) return activityB.at.getTime() - activityA.at.getTime();
        if (activityA) return -1;
        if (activityB) return 1;
        return b.updatedAt.getTime() - a.updatedAt.getTime();
      })
      .slice(0, 2),
    [goalActivity, goals],
  );

  return (
    <Card elevation="md" padding="spacious" style={{ borderWidth: 0, flex: 1, minHeight: 604 }}>
      <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACE['2xl'] }}>
        <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.sm }}>
          <BrandIcon name="goals" size={22} tintColor={colors.accent.primary} />
          <Typography variant="eyebrow" style={{ color: colors.text.primary, fontSize: 12 }}>Goals</Typography>
        </View>
        <DashboardCreateButton label="New Goal" onPress={() => router.push('/goals/create')} />
      </View>
      <View style={{ gap: SPACE.xl }}>
        {visibleGoals.map((goal) => (
          <HomeGoalPreview key={goal.id} goal={goal} linkedActivity={goalActivity[goal.id]} />
        ))}
        {!visibleGoals.length ? <Typography variant="hint">No active goals yet.</Typography> : null}
      </View>
      <Pressable
        onPress={() => router.push('/(app)/goals' as never)}
        style={({ pressed }) => ({ justifyContent: 'center', minHeight: 44, opacity: pressed ? 0.6 : 1, marginTop: SPACE.lg })}
      >
        <Typography variant="emphasis-sm" style={{ color: colors.text.accent }}>View all Goals →</Typography>
      </Pressable>
    </Card>
  );
}

// --- Zone 1: Today's Trackers ---

type DueTodayItem = {
  goalId: string;
  goalTitle: string;
  id: string;
  title: string;
  lastCompletedAt: string | null;
};

type DueTodayApiGroup = {
  goalId: string;
  goalTitle: string;
  trackers: Array<{
    id: string;
    title: string;
    lastCompletedAt: string | null;
  }>;
};

function isCompletedToday(lastCompletedAt: string | null): boolean {
  if (!lastCompletedAt) return false;
  const last = new Date(lastCompletedAt);
  const now = new Date();
  return (
    last.getFullYear() === now.getFullYear() &&
    last.getMonth() === now.getMonth() &&
    last.getDate() === now.getDate()
  );
}

function TodayHeader({ bottomMargin = 16 }: { bottomMargin?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: bottomMargin }}>
      <BrandIcon name="today" size={18} />
      <Typography variant="eyebrow">
        Today
      </Typography>
    </View>
  );
}

function DueTodayZone() {
  const colors = useThemeColors();
  const [items, setItems] = useState<DueTodayItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [completingIds, setCompletingIds] = useState(new Set<string>());

  useEffect(() => {
    let isActive = true;
    async function load() {
      try {
        const res = await authedFetch('/api/trackers/due-today');
        if (!res.ok || !isActive) return;
        const body = (await res.json()) as { data: DueTodayApiGroup[] };
        if (!isActive) return;
        setItems(
          body.data.flatMap((group) =>
            group.trackers.map((tracker) => ({
              goalId: group.goalId,
              goalTitle: group.goalTitle,
              id: tracker.id,
              title: tracker.title,
              lastCompletedAt: tracker.lastCompletedAt,
            })),
          ),
        );
      } catch {
        // Fail silently — empty state shown
      } finally {
        if (isActive) setLoading(false);
      }
    }
    void load();
    return () => {
      isActive = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleComplete(item: DueTodayItem) {
    if (isCompletedToday(item.lastCompletedAt) || completingIds.has(item.id)) return;
    setCompletingIds((prev) => new Set(prev).add(item.id));
    try {
      const res = await authedFetch('/api/goals/complete-tracker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackerId: item.id, goalId: item.goalId }),
      });
      if (!res.ok) throw new Error('Request failed');
      setItems((prev) =>
        prev.map((m) =>
          m.id === item.id ? { ...m, lastCompletedAt: new Date().toISOString() } : m,
        ),
      );
    } catch {
      // Fail silently — row stays unchecked
    } finally {
      setCompletingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  }

  if (loading) {
    return (
      <View
        className="rounded-2xl border p-5"
        style={{ backgroundColor: colors.background.card, borderColor: colors.border.divider }}
      >
        <View
          className="mb-4 h-2.5 w-16 rounded-full"
          style={{ backgroundColor: colors.background.subtle }}
        />
        {[0, 1].map((i) => (
          <View key={i} className="mb-3 flex-row items-center gap-3">
            <View
              className="h-5 w-5 rounded-full"
              style={{ backgroundColor: colors.background.subtle }}
            />
            <View className="flex-1 gap-2">
              <View
                className="h-2 w-14 rounded-full"
                style={{ backgroundColor: colors.background.input }}
              />
              <View
                className="h-3 w-3/4 rounded-full"
                style={{ backgroundColor: colors.background.subtle }}
              />
            </View>
          </View>
        ))}
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View
        className="rounded-2xl border p-5"
        style={{ backgroundColor: colors.background.card, borderColor: colors.border.divider }}
      >
        <TodayHeader bottomMargin={12} />
        <Text className="font-sans text-[14px]" style={{ color: colors.text.muted }}>
          Nothing due today.
        </Text>
      </View>
    );
  }

  return (
    <View
      className="rounded-2xl border p-5"
      style={{ backgroundColor: colors.background.card, borderColor: colors.border.divider }}
    >
      <TodayHeader />
      <View className="gap-3">
        {items.map((item) => {
          const done = isCompletedToday(item.lastCompletedAt);
          const completing = completingIds.has(item.id);
          return (
            <View key={item.id} className="flex-row items-center gap-3">
              <TouchableOpacity
                onPress={() => void handleComplete(item)}
                disabled={done || completing}
                className="h-6 w-6 items-center justify-center rounded-full border-2"
                style={{ borderColor: done ? colors.accent.primary : colors.border.input }}
              >
                {done && (
                  <Text
                    className="text-xs font-inter-semibold"
                    style={{ color: colors.accent.primary }}
                  >
                    ✓
                  </Text>
                )}
                {completing && !done && (
                  <View
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: colors.border.input }}
                  />
                )}
              </TouchableOpacity>
              <View className="flex-1">
                <Text className="font-sans text-[11px]" style={{ color: colors.text.muted }}>
                  {item.goalTitle}
                </Text>
                <Typography
                  variant="content"
                  style={done ? { color: colors.text.muted } : undefined}
                >
                  {item.title}
                </Typography>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// --- ActiveGoalCard ---

interface ActiveGoalCardProps {
  goal: GoalWithDetails;
}

function ActiveGoalCard({ goal }: ActiveGoalCardProps) {
  const colors = useThemeColors();
  const { action, isLoading: actionLoading, isError: actionError, mutate } =
    useLatestAction(goal.id);
  const [isMutating, setIsMutating] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [optimisticAction, setOptimisticAction] = useState<
    ActionLog | null | undefined
  >(undefined);

  const displayedAction = useMemo(
    () => (optimisticAction !== undefined ? optimisticAction : action),
    [action, optimisticAction],
  );

  async function handleUpdateStatus(status: 'complete' | 'skipped') {
    const current = displayedAction;
    if (!current || isMutating) return;

    setMutationError(null);
    setOptimisticAction(null);
    setIsMutating(true);

    try {
      const res = await authedFetch(`/api/actions/${current.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed to update action');
    } catch (err) {
      setOptimisticAction(current);
      setMutationError(err instanceof Error ? err.message : 'Failed to update');
      setIsMutating(false);
      return;
    }

    try {
      await mutate();
      setOptimisticAction(undefined);
    } catch {
      setMutationError('Saved, but failed to refresh.');
    } finally {
      setIsMutating(false);
    }
  }

  return (
    <View
      className="rounded-2xl border p-5"
      style={{ backgroundColor: colors.background.card, borderColor: colors.border.divider }}
    >
      <Pressable onPress={() => router.push(goalWorkspaceHref(goal.id) as never)}>
        <Typography variant="eyebrow" className="mb-2">
          Active Goal
        </Typography>
        <GoalTitleRow
          title={goal.title}
          variant="active-goal-title"
          iconSize={18}
          style={{ alignItems: 'center', marginBottom: 16 }}
          iconStyle={{ marginTop: 0 }}
        />
      </Pressable>

      <View className="border-t pt-4" style={{ borderColor: colors.border.divider }}>
        <Typography variant="eyebrow" className="mb-3">
          Next Action
        </Typography>

        {mutationError ? (
          <Text
            className="mb-2 font-sans text-xs"
            style={{ color: colors.feedback.danger.text }}
          >
            {mutationError}
          </Text>
        ) : null}

        {actionLoading && optimisticAction === undefined ? (
          <View className="gap-2">
            <View
              className="h-3 w-3/5 rounded-full"
              style={{ backgroundColor: colors.background.subtle }}
            />
            <View
              className="h-3 w-4/5 rounded-full"
              style={{ backgroundColor: colors.background.input }}
            />
          </View>
        ) : actionError && optimisticAction === undefined ? (
          <Text className="font-sans text-sm" style={{ color: colors.feedback.danger.text }}>
            Couldn&apos;t load next action.
          </Text>
        ) : displayedAction ? (
          <View>
            <Typography variant="content" className="mb-4">
              {displayedAction.actionText}
            </Typography>
            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 items-center rounded-full py-2.5"
                style={{
                  backgroundColor: isMutating
                    ? colors.background.subtle
                    : colors.accent.primary,
                }}
                onPress={() => void handleUpdateStatus('complete')}
                disabled={isMutating}
              >
                <Typography variant="emphasis-sm" style={{ color: colors.text.inverse }}>
                  {isMutating ? 'Saving…' : 'Complete'}
                </Typography>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 items-center rounded-full border py-2.5"
                style={{
                  backgroundColor: isMutating
                    ? colors.background.subtle
                    : colors.background.input,
                  borderColor: colors.border.divider,
                }}
                onPress={() => void handleUpdateStatus('skipped')}
                disabled={isMutating}
              >
                <Typography variant="label">Skip</Typography>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <Pressable
            className="self-start rounded-full px-4 py-2"
            style={{ backgroundColor: colors.background.selectedRow }}
            onPress={() => router.push(goalWorkspaceHref(goal.id) as never)}
          >
            <Typography variant="emphasis-sm" style={{ color: colors.text.accent }}>
              Set next action
            </Typography>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function NoActiveGoalCard() {
  const colors = useThemeColors();

  return (
    <View
      className="rounded-2xl border p-5"
      style={{ backgroundColor: colors.background.card, borderColor: colors.border.divider }}
    >
      <Typography variant="eyebrow" className="mb-2">
        Active Goal
      </Typography>
      <Typography variant="body" className="mb-4">
        No active goal yet.
      </Typography>
      <Pressable
        className="self-start rounded-full px-4 py-2.5"
        style={{ backgroundColor: colors.accent.primary }}
        onPress={() => router.push('/goals/create')}
      >
        <Typography variant="emphasis-sm" style={{ color: colors.text.inverse }}>
          Create a goal
        </Typography>
      </Pressable>
    </View>
  );
}

// --- Home previews ---

function ProjectPreview({
  goals,
  isLoading,
  onNewProject,
  project,
}: {
  goals: GoalWithDetails[];
  isLoading: boolean;
  onNewProject: () => void;
  project: Project | null;
}) {
  const colors = useThemeColors();
  const projectGoals = project ? goals.filter((goal) => goal.projectId === project.id) : [];
  const progress = projectGoals.length
    ? Math.round(projectGoals.reduce((total, goal) => total + goal.progress, 0) / projectGoals.length)
    : 0;

  return (
    <Card
      elevation="md"
      padding="spacious"
      style={{ borderWidth: 0, flex: 1, minHeight: 194 }}
    >
      <View style={{ flex: 1 }}>
        <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACE.xl }}>
          <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.lg }}>
            <BrandIcon name="project" size={20} tintColor={colors.accent.primary} />
            <Typography variant="eyebrow" style={{ color: colors.text.primary, fontSize: 12 }}>
              Projects
            </Typography>
          </View>
          <DashboardCreateButton label="New Project" onPress={onNewProject} />
        </View>
        {isLoading ? (
          <View style={{ gap: SPACE.sm }}>
            <View
              className="h-5 w-1/2 rounded-full"
              style={{ backgroundColor: colors.background.subtle }}
            />
            <View className="h-3 w-3/4 rounded-full" style={{ backgroundColor: colors.background.subtle }} />
          </View>
        ) : project ? (
          <Pressable
            accessibilityLabel={`Open ${project.title}`}
            accessibilityRole="button"
            onPress={() => router.push(`/(app)/projects/${project.id}` as never)}
            style={({ pressed }) => ({ flex: 1, justifyContent: 'center', opacity: pressed ? 0.68 : 1 })}
          >
            <Typography variant="title" numberOfLines={1} style={{ fontSize: 22, fontWeight: '500', lineHeight: 30 }}>
              {project.title}
            </Typography>
            {project.description ? (
              <Typography numberOfLines={2} variant="body" style={{ color: colors.text.secondary, marginTop: SPACE.sm }}>
                {project.description}
              </Typography>
            ) : null}
            <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACE.lg }}>
              <Typography variant="caption">
                {projectGoals.length} {projectGoals.length === 1 ? 'goal' : 'goals'} connected · {progress}%
              </Typography>
              <Typography variant="emphasis-sm" style={{ color: colors.text.accent }}>Open →</Typography>
            </View>
          </Pressable>
        ) : (
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <Typography variant="title" style={{ fontSize: 20, fontWeight: '500' }}>No projects yet.</Typography>
            <Typography variant="body" style={{ color: colors.text.secondary, marginTop: SPACE.sm }}>
              Create a project to connect the goals that move it forward.
            </Typography>
          </View>
        )}
      </View>
    </Card>
  );
}

function EchoEntryPreviewCard({
  entry,
  entryType,
  isLoading,
}: {
  entry: DashboardEntryPreview | null;
  entryType: 'note' | 'reflection';
  isLoading: boolean;
}) {
  const colors = useThemeColors();
  const isNote = entryType === 'note';
  const heading = isNote ? 'Echo Notes' : 'Echo Reflections';
  const emptyTitle = isNote ? 'No notes yet.' : 'No reflections yet.';
  const emptyCopy = isNote
    ? 'Capture something you want to remember.'
    : 'Take a moment to notice what changed.';
  const createLabel = isNote ? 'New Note' : 'New Reflection';
  const createRoute = isNote
    ? '/(app)/entries?create=note'
    : '/(app)/entries/reflection';

  return (
    <Card elevation="md" padding="spacious" style={{ borderWidth: 0, flex: 1, minHeight: 218 }}>
      <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACE.xl }}>
        <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.lg }}>
          <BrandIcon name={isNote ? 'echo-add-entry' : 'echo'} size={20} tintColor={colors.accent.primary} />
          <Typography variant="eyebrow" style={{ color: colors.text.primary, fontSize: 12 }}>
            {heading}
          </Typography>
        </View>
        <DashboardCreateButton
          label={createLabel}
          onPress={() => router.push(createRoute as never)}
        />
      </View>

      {isLoading ? (
        <View style={{ gap: SPACE.sm }}>
          <View className="h-5 w-1/2 rounded-full" style={{ backgroundColor: colors.background.subtle }} />
          <View className="h-3 w-3/4 rounded-full" style={{ backgroundColor: colors.background.subtle }} />
        </View>
      ) : entry ? (
        <Pressable
          accessibilityLabel={`Open ${entry.title}`}
          accessibilityRole="button"
          onPress={() => router.push(`/(app)/entries/${entry.id}` as never)}
          style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.68 : 1 })}
        >
          <Typography variant="title" numberOfLines={1} style={{ fontSize: 20, fontWeight: '500', lineHeight: 28 }}>
            {entry.title}
          </Typography>
          {entry.excerpt ? (
            <Typography numberOfLines={2} variant="body" style={{ color: colors.text.secondary, marginTop: SPACE.sm }}>
              {entry.excerpt}
            </Typography>
          ) : null}
          <View style={{ alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACE.lg }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              {entry.linkedGoalTitle ? (
                <Typography numberOfLines={1} variant="caption">Linked to: {entry.linkedGoalTitle}</Typography>
              ) : null}
              <Typography variant="caption" style={{ marginTop: entry.linkedGoalTitle ? 2 : 0 }}>
                Edited {formatRelativeTime(entry.updatedAt.toISOString())}
              </Typography>
            </View>
            <Typography variant="emphasis-sm" style={{ color: colors.text.accent, marginLeft: SPACE.xl }}>Open →</Typography>
          </View>
        </Pressable>
      ) : (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Typography variant="title" style={{ fontSize: 20, fontWeight: '500' }}>{emptyTitle}</Typography>
          <Typography variant="body" style={{ color: colors.text.secondary, marginTop: SPACE.sm }}>{emptyCopy}</Typography>
        </View>
      )}
    </Card>
  );
}

// --- Zone 3: Intelligence ---

interface IntelligenceZoneProps {
  insight: string | null;
  isLoading: boolean;
}

function IntelligenceZone({ insight, isLoading }: IntelligenceZoneProps) {
  const colors = useThemeColors();

  if (isLoading) {
    return (
      <View
        className="rounded-2xl px-5 py-4"
        style={{ backgroundColor: colors.background.input }}
      >
        <View
          className="h-3 w-3/4 rounded-full"
          style={{ backgroundColor: colors.background.subtle }}
        />
      </View>
    );
  }

  if (insight) {
    return (
      <View
        className="rounded-2xl border p-5"
        style={{ backgroundColor: colors.background.card, borderColor: colors.border.divider }}
      >
        <Typography variant="eyebrow" className="mb-2">
          Intelligence
        </Typography>
        <Typography variant="content">{insight}</Typography>
      </View>
    );
  }

  return (
    <View
      className="rounded-2xl px-5 py-4"
      style={{ backgroundColor: colors.background.input }}
    >
      <Typography variant="meta" className="text-center" style={{ color: colors.text.muted }}>
        Keep adding entries — Ohara is learning about you.
      </Typography>
    </View>
  );
}

// --- Skeleton for initial load ---

function DashboardSkeleton() {
  const colors = useThemeColors();

  return (
    <View className="gap-3">
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          className="rounded-2xl border p-5"
          style={{ backgroundColor: colors.background.card, borderColor: colors.border.divider }}
        >
          <View
            className="mb-3 h-2.5 w-20 rounded-full"
            style={{ backgroundColor: colors.background.subtle }}
          />
          <View
            className="mb-2 h-5 w-3/4 rounded-lg"
            style={{ backgroundColor: colors.background.input }}
          />
          <View
            className="h-3 w-1/2 rounded-full"
            style={{ backgroundColor: colors.background.input }}
          />
        </View>
      ))}
    </View>
  );
}

// --- Main Screen ---

type IntelligenceData = {
  insight: string | null;
  sufficient: boolean;
};

export default function DashboardScreen() {
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const compact = width < 720;
  const tablet = width >= 720 && width < 1180;
  const primaryRowSideBySide = width >= 1180;
  const dashboardHorizontalPadding = compact ? 0 : undefined;
  const routeParams = useLocalSearchParams<{
    draftSaved?: string | string[];
    goalFilter?: string | string[];
  }>();
  const { goals, isLoading: goalsLoading } = useGoals();
  const { session } = useSession();
  const momentum = useMomentumHomeSummary();
  const { projects, isLoading: projectsLoading, loadProjects } = useProjectStore();
  const entryPreviews = useDashboardEntryPreviews(
    FEATURES.ECHO_ENABLED ? session?.user.id ?? null : null,
  );
  const standaloneGoalsView = useUIStore((state) => state.dashboardGoalsView);
  const setStandaloneGoalsView = useUIStore((state) => state.setDashboardGoalsView);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [reflectionTimestamps, setReflectionTimestamps] =
    useState<ReflectionTimestampsByGoalId>({});
  const [goalActivity, setGoalActivity] = useState<GoalActivityByGoalId>({});
  const dashboardTimingRef = useRef<ReturnType<typeof startPerformanceTimer> | null>(null);
  if (!dashboardTimingRef.current) {
    dashboardTimingRef.current = startPerformanceTimer('dashboard.primary-content-ready', {
      phase: 'initial-load',
    });
  }
  const [showAllStandaloneGoals, setShowAllStandaloneGoals] = useState(false);
  const [expandedStandaloneGoalIds, setExpandedStandaloneGoalIds] = useState<Set<string>>(
    () => new Set(),
  );

  const draftsRequested = routeParams[DASHBOARD_GOAL_FILTER_PARAM] === 'drafts';
  const draftSaved = routeParams[DASHBOARD_DRAFT_SAVED_PARAM] === '1';
  const [draftToastVisible, setDraftToastVisible] = useState(draftSaved);

  useEffect(() => {
    if (!draftSaved) return;
    setDraftToastVisible(true);
    const timer = setTimeout(() => setDraftToastVisible(false), 4000);
    return () => clearTimeout(timer);
  }, [draftSaved]);

  useEffect(() => {
    if (goalsLoading || projectsLoading) return;
    dashboardTimingRef.current?.end({
      success: true,
      resultCount: goals.length + projects.length,
    });
  }, [goals.length, goalsLoading, projects.length, projectsLoading]);

  useEffect(() => {
    loadProjects();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fire-and-forget: reconcile any unsummarized Echo entries in the background.
  // The ref guard prevents duplicate calls from StrictMode double-invocation.
  const reconcileInFlight = useRef(false);
  useEffect(() => {
    if (reconcileInFlight.current) return;
    reconcileInFlight.current = true;

    async function reconcile() {
      try {
        const res = await authedFetch('/api/echo/reconcile', { method: 'POST' });
        if (!res.ok) {
          console.warn(`Echo reconcile: server responded with status ${res.status}`);
        }
      } catch (err: unknown) {
        console.warn('Echo reconcile: fetch error:', err);
      } finally {
        reconcileInFlight.current = false;
      }
    }

    void reconcile();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const {
    cachedInsight,
    insightFetched,
    insightLoading,
    setCachedInsight,
    setInsightFetched,
    setInsightLoading,
  } = useProfileStore();

  // Fetch intelligence insight once per session when the feature is enabled.
  // Falls back silently to the dormant state if the API call fails or the
  // profile is not yet sufficient.
  useEffect(() => {
    if (!FEATURES.INTELLIGENCE_ENABLED) return;
    if (insightFetched) return;

    let isActive = true;

    async function fetchInsight() {
      setInsightLoading(true);
      setInsightFetched(true);

      try {
        const res = await authedFetch('/api/intelligence', { method: 'POST' });

        if (!res.ok || !isActive) return;

        const body = (await res.json()) as AiResponse<IntelligenceData>;
        if (!body.ok || !isActive) return;

        if (isActive) {
          setCachedInsight(body.data.insight ?? null);
        }
      } catch {
        // Fail silently — IntelligenceZone will show the dormant fallback
      } finally {
        if (isActive) setInsightLoading(false);
      }
    }

    void fetchInsight();

    return () => {
      isActive = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const standaloneGoals = useMemo(
    () => goals
      .filter((goal) => goal.projectId === null)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
    [goals],
  );
  const draftGoals = useMemo(
    () => goals
      .filter((goal) => goal.status === 'draft')
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()),
    [goals],
  );
  const displayedGoals = draftsRequested ? draftGoals : standaloneGoals;
  const hiddenStandaloneGoalCount = Math.max(0, displayedGoals.length - 7);
  const visibleStandaloneGoals = showAllStandaloneGoals
    ? displayedGoals
    : displayedGoals.slice(0, 7);

  const activeGoals = useMemo(
    () => selectActiveGoals(goals),
    [goals],
  );
  const activeGoalIds = useMemo(() => activeGoals.map((goal) => goal.id), [activeGoals]);
  const activeGoalIdsKey = activeGoalIds.join(',');

  useEffect(() => {
    if (activeGoalIds.length === 0) {
      setReflectionTimestamps({});
      return;
    }

    let isActive = true;
    const timing = startPerformanceTimer('dashboard.active-goal-reflections', {
      phase: 'initial-load',
    });
    async function loadReflectionTimestamps() {
      try {
        const timestamps = await fetchActiveGoalReflectionTimestamps(activeGoalIds);
        if (!isActive) return;
        setReflectionTimestamps(timestamps);
        timing.end({
          success: true,
          resultCount: Object.values(timestamps).filter(Boolean).length,
          requestCount: 1,
        });
      } catch {
        if (!isActive) return;
        setReflectionTimestamps({});
        timing.end({ success: false, requestCount: 1 });
      }
    }

    void loadReflectionTimestamps();
    return () => {
      isActive = false;
    };
  // activeGoalIdsKey intentionally represents the active goal-ID list for this read.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGoalIdsKey]);

  useEffect(() => {
    const userId = session?.user.id;
    if (!userId || activeGoalIds.length === 0) {
      setGoalActivity({});
      return;
    }

    let isActive = true;
    void fetchDashboardGoalActivity(userId, activeGoalIds)
      .then((activity) => {
        if (isActive) setGoalActivity(activity);
      })
      .catch(() => {
        if (isActive) setGoalActivity({});
      });

    return () => { isActive = false; };
  // activeGoalIdsKey intentionally represents the active goal-ID list for this read.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGoalIdsKey, session?.user.id]);

  const orderedActiveGoals = useMemo(
    () => orderActiveGoals(activeGoals, reflectionTimestamps),
    [activeGoals, reflectionTimestamps],
  );
  const todayGoals = useMemo(
    () => resolveActiveGoalProjectTitles(orderedActiveGoals, projects),
    [orderedActiveGoals, projects],
  );
  const recentProject = useMemo(
    () => [...projects]
      .filter((project) => project.status !== 'archived')
      .sort((left, right) => Date.parse(right.updated_at) - Date.parse(left.updated_at))[0] ?? null,
    [projects],
  );

  const displayName = displayNameFromMetadata(session?.user.user_metadata)
    ?? displayNameFromEmail(session?.user.email);

  const greetingCard = (
    <DashboardGreeting
      displayName={displayName}
      momentumLoading={momentum.isLoading}
      weeklyStreak={momentum.summary?.weeklyStreak ?? null}
    />
  );
  const todayCard = <TodayFocusSummary goals={todayGoals} />;
  const momentumCard = (
    <MomentumCard
      error={momentum.error}
      isLoading={momentum.isLoading}
      summary={momentum.summary}
    />
  );
  const goalsCard = (
    <HomeGoalsPreview goals={orderedActiveGoals} goalActivity={goalActivity} />
  );
  const projectCard = (
    <ProjectPreview
      goals={goals}
      isLoading={projectsLoading}
      onNewProject={() => setProjectModalOpen(true)}
      project={recentProject}
    />
  );
  const echoNotesCard = FEATURES.ECHO_ENABLED ? (
    <EchoEntryPreviewCard entry={entryPreviews.note} entryType="note" isLoading={entryPreviews.isLoading} />
  ) : null;
  const echoReflectionsCard = FEATURES.ECHO_ENABLED ? (
    <EchoEntryPreviewCard entry={entryPreviews.reflection} entryType="reflection" isLoading={entryPreviews.isLoading} />
  ) : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.page }}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingLeft: dashboardHorizontalPadding ?? SPACE['3xl'],
          paddingRight: dashboardHorizontalPadding ?? SPACE['3xl'],
          paddingBottom: compact ? 104 : SPACE.lg,
          paddingTop: compact ? 0 : SPACE.lg,
        }}
      >
        <View
          style={{
            alignSelf: 'stretch',
            backgroundColor: colors.background.card,
            borderColor: colors.border.warmSubtle,
            borderRadius: compact ? 0 : RADIUS.xl,
            borderWidth: compact ? 0 : 1,
            minWidth: 0,
            padding: compact ? SPACE.xl : SPACE['2xl'],
            width: '100%',
          }}
        >

        {goalsLoading || projectsLoading ? (
          <DashboardSkeleton />
        ) : (
          <View style={{ gap: SPACE['3xl'] }}>
            {primaryRowSideBySide ? (
              <View style={{ alignItems: 'stretch', flexDirection: 'row', gap: SPACE['3xl'] }}>
                <View style={{ flex: 0.3, gap: SPACE['3xl'], minWidth: 0 }}>
                  {greetingCard}
                  {todayCard}
                  {projectCard}
                </View>
                <View style={{ flex: 0.34, minWidth: 0 }}>{momentumCard}</View>
                <View style={{ flex: 0.36, minWidth: 0 }}>{goalsCard}</View>
              </View>
            ) : tablet ? (
              <View style={{ gap: SPACE['3xl'] }}>
                <View style={{ alignItems: 'stretch', flexDirection: 'row', gap: SPACE['3xl'] }}>
                  <View style={{ flex: 1, gap: SPACE['3xl'], minWidth: 0 }}>
                    {greetingCard}
                    {todayCard}
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>{momentumCard}</View>
                </View>
                <View style={{ alignItems: 'stretch', flexDirection: 'row', gap: SPACE['3xl'] }}>
                  <View style={{ flex: 1, minWidth: 0 }}>{goalsCard}</View>
                  <View style={{ flex: 1, minWidth: 0 }}>{projectCard}</View>
                </View>
              </View>
            ) : (
              <View style={{ gap: SPACE['3xl'] }}>
                {greetingCard}
                {todayCard}
                {momentumCard}
                {goalsCard}
                {projectCard}
              </View>
            )}

            {/* Echo Notes and Reflections */}
            {FEATURES.ECHO_ENABLED ? (
              <View style={{ flexDirection: width >= 720 ? 'row' : 'column', gap: SPACE['3xl'] }}>
                <View style={{ flex: 1, minWidth: 0 }}>{echoNotesCard}</View>
                <View style={{ flex: 1, minWidth: 0 }}>{echoReflectionsCard}</View>
              </View>
            ) : null}

            {/* Zone 3: Standalone Goals */}
            {draftsRequested ? <Card elevation="sm" padding="spacious">
              <View style={{ alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACE.xl }}>
                <View style={{ alignItems: 'center', flexDirection: 'row', gap: 6 }}>
                  <BrandIcon name="goals" size={20} tintColor={colors.accent.primary} />
                  <View>
                    <Typography variant="eyebrow" style={{ color: colors.text.accent }}>
                      {draftsRequested ? 'Drafts' : 'Goals'}
                    </Typography>
                    <Typography variant="title" style={{ fontSize: 20, marginTop: 4 }}>
                      {draftsRequested ? 'Ideas waiting for your return' : 'Where your attention is taking you'}
                    </Typography>
                  </View>
                </View>
                <DashboardCreateButton
                  label="New Goal"
                  onPress={() => router.push('/goals/create')}
                />
              </View>
              <View style={{ alignItems: 'center', flexDirection: 'row', gap: 8, marginBottom: SPACE.xl }}>
                  <Pressable
                    accessibilityLabel={draftsRequested ? 'Show all goals' : 'Show draft goals'}
                    accessibilityRole="button"
                    hitSlop={8}
                    onPress={() => {
                      setShowAllStandaloneGoals(false);
                      router.replace(draftsRequested ? '/dashboard' : DASHBOARD_DRAFTS_ROUTE);
                    }}
                    style={({ pressed }) => ({
                      backgroundColor: draftsRequested ? colors.background.selectedRow : 'transparent',
                      borderColor: draftsRequested ? colors.border.accent : colors.border.subtle,
                      borderRadius: 999,
                      borderWidth: 1,
                      opacity: pressed ? 0.55 : 1,
                      minHeight: 36,
                      justifyContent: 'center',
                      paddingHorizontal: 14,
                    })}
                  >
                    <Typography variant="badge-text" style={{ color: colors.text.accent }}>
                      {draftsRequested ? 'All goals' : `Drafts${draftGoals.length ? ` · ${draftGoals.length}` : ''}`}
                    </Typography>
                  </Pressable>
                  <Pressable
                    accessibilityLabel={
                      standaloneGoalsView === 'list'
                        ? 'Show goals as cards'
                        : 'Show goals as compact rows'
                    }
                    accessibilityRole="button"
                    hitSlop={8}
                    onPress={() => setStandaloneGoalsView(
                      standaloneGoalsView === 'list' ? 'grid' : 'list',
                    )}
                    style={({ pressed }) => ({
                      alignItems: 'center',
                      backgroundColor: colors.background.input,
                      borderColor: colors.border.warm,
                      borderRadius: 999,
                      borderWidth: 1,
                      height: 36,
                      justifyContent: 'center',
                      opacity: pressed ? 0.55 : 1,
                      width: 44,
                    })}
                  >
                    <Ionicons
                      color={colors.text.accent}
                      name={standaloneGoalsView === 'list' ? 'grid-outline' : 'list-outline'}
                      size={16}
                    />
                  </Pressable>
              </View>
              {standaloneGoalsView === 'list' ? (
                visibleStandaloneGoals.length > 0 ? (
                  <View style={{ gap: 8 }}>
                    {visibleStandaloneGoals.map((goal) => (
                      <View key={goal.id} style={{ gap: 8 }}>
                        <ProjectGoalRow
                          expanded={expandedStandaloneGoalIds.has(goal.id)}
                          goal={goal}
                          onToggleExpanded={() => setExpandedStandaloneGoalIds((current) => {
                            const next = new Set(current);
                            if (next.has(goal.id)) next.delete(goal.id);
                            else next.add(goal.id);
                            return next;
                          })}
                        />
                        {expandedStandaloneGoalIds.has(goal.id) ? (
                          <View style={{ gap: 8 }}>
                            <GoalCard goal={goal} showMenu={false} />
                            <GoalEchoAnalysisCard
                              category={goal.category}
                              goalId={goal.id}
                              navigationAction="momentum"
                            />
                          </View>
                        ) : null}
                      </View>
                    ))}
                  </View>
                ) : (
                  <Typography variant="hint">
                    {draftsRequested ? 'No drafts yet.' : 'No standalone goals yet.'}
                  </Typography>
                )
              ) : (
                <GoalRingGrid
                  goals={visibleStandaloneGoals}
                  emptyMessage={draftsRequested ? 'No drafts yet.' : 'No standalone goals yet.'}
                />
              )}
              {hiddenStandaloneGoalCount > 0 ? (
                <Pressable
                  accessibilityLabel={
                    showAllStandaloneGoals
                      ? 'Hide older goals'
                      : `Show ${hiddenStandaloneGoalCount} more goals`
                  }
                  accessibilityRole="button"
                  onPress={() => setShowAllStandaloneGoals((showAll) => !showAll)}
                  style={({ pressed }) => ({
                    alignSelf: 'center',
                    marginTop: 12,
                    opacity: pressed ? 0.55 : 1,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                  })}
                >
                  <Typography variant="label" style={{ color: colors.text.accent }}>
                    {showAllStandaloneGoals ? 'Hide' : `Show ${hiddenStandaloneGoalCount}+`}
                  </Typography>
                </Pressable>
              ) : null}
            </Card> : null}

            {/* Zone 5: Intelligence */}
            <IntelligenceZone
              insight={cachedInsight}
              isLoading={insightLoading}
            />

          </View>
        )}
        </View>
      </ScrollView>
      <Toast
        message="Saved as draft — pick it back up anytime"
        visible={draftToastVisible}
      />
      <CreateProjectModal
        visible={projectModalOpen}
        onClose={() => setProjectModalOpen(false)}
      />
    </SafeAreaView>
  );
}
