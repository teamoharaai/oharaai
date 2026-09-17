import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { BrandIcon } from '@/components/ui/BrandIcon';
import { Card } from '@/components/ui/Card';
import type { TodayCarouselGoal } from '@/components/ui/TodayCarousel';
import { Toast } from '@/components/ui/Toast';
import { Typography } from '@/components/ui/Typography';
import { CirclesScreen } from '@/features/circles/components/CirclesScreen';
import { useGoals } from '@/features/goals/hooks/useGoals';
import { goalWorkspaceHref } from '@/features/goals/navigation';
import { useSession } from '@/features/auth/hooks/useSession';
import { useProjectStore } from '@/features/projects/store';
import { useMomentumHomeSummary } from '@/features/momentum/hooks/useMomentumHomeSummary';
import { ProjectGoalRow } from '@/features/goals/components/ProjectGoalRow';
import {
  orderActiveGoals,
  resolveActiveGoalProjectTitles,
  selectActiveGoals,
  type ReflectionTimestampsByGoalId,
} from '@/features/goals/active-goal-selectors';
import { fetchActiveGoalReflectionTimestamps } from '@/features/goals/services/active-goal-reflection-service';
import {
  DASHBOARD_DRAFT_SAVED_PARAM,
  DASHBOARD_GOAL_FILTER_PARAM,
} from '@/lib/navigation/dashboard';
import { useThemeColors, useUIStore } from '@/store/uiStore';
import { authedFetch } from '@/lib/api/client';
import { RADIUS, SPACE } from '@/constants/design';
import { getCategoryAccentTheme } from '@/constants/themes';

/*
 * Home. Internally this surface is "Circles" (features/circles): the social
 * feed plus shared goals. From the previous Home it keeps only the greeting and
 * Today's Focus, and the drafts list reached via DASHBOARD_DRAFTS_ROUTE.
 */

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

/**
 * Progress rule shared with Circles: completed top-level milestones / total.
 * Sub-milestones roll up into their parent achievement, so they don't count.
 * (The legacy goals.progress column only flips to 100 on completion.)
 */
function milestoneProgressLabel(goal: TodayCarouselGoal): string {
  const milestones = (goal.milestones ?? []).filter((milestone) => milestone.parentId === null);
  if (milestones.length === 0) return 'No milestones';
  const done = milestones.filter((milestone) => milestone.completedAt !== null).length;
  return `${done}/${milestones.length}`;
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
    <View style={{ justifyContent: 'center', minHeight: 116 }}>
      <Typography
        variant="body"
        style={{ color: colors.text.secondary, fontSize: 18, lineHeight: 26 }}
      >
        Welcome back,
      </Typography>
      <Typography
        variant="greeting"
        style={{ fontSize: 46, letterSpacing: -1.5, lineHeight: 54 }}
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
        minHeight: 42,
        opacity: pressed ? 0.72 : 1,
        paddingHorizontal: SPACE.lg,
        paddingVertical: SPACE.sm,
      })}
    >
      <Typography
        variant="control"
        style={{ color: colors.text.accent }}
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
                  variant="control"
                  style={{ flexShrink: 1 }}
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
                    style={{ color: darkMode ? categoryTheme.color : categoryTheme.mid, fontSize: 12 }}
                  >
                    {goal.projectTitle ?? formatCategoryLabel(goal.category)}
                  </Typography>
                </View>
              </View>
              <Typography
                variant="caption"
                accessibilityLabel={`Milestones: ${milestoneProgressLabel(goal)}`}
                style={{ color: colors.text.accent, marginLeft: SPACE.lg, minWidth: 32, textAlign: 'right' }}
              >
                {milestoneProgressLabel(goal)}
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

function DraftsCard({ drafts }: { drafts: ReturnType<typeof useGoals>['goals'] }) {
  const colors = useThemeColors();
  return (
    <Card elevation="sm" padding="spacious">
      <View style={{ alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACE.xl }}>
        <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.sm }}>
          <BrandIcon name="goals" size={20} tintColor={colors.accent.primary} />
          <View>
            <Typography variant="eyebrow" style={{ color: colors.text.accent }}>Drafts</Typography>
            <Typography variant="title" style={{ fontSize: 20, marginTop: 4 }}>Ideas waiting for your return</Typography>
          </View>
        </View>
        <DashboardCreateButton label="New Goal" onPress={() => router.push('/goals/create')} />
      </View>
      {drafts.length > 0 ? (
        <View style={{ gap: SPACE.md }}>
          {drafts.map((goal) => <ProjectGoalRow goal={goal} key={goal.id} />)}
        </View>
      ) : (
        <Typography variant="hint">No drafts yet.</Typography>
      )}
      <Pressable
        accessibilityRole="button"
        onPress={() => router.replace('/dashboard')}
        style={({ pressed }) => ({ alignSelf: 'flex-start', marginTop: SPACE.lg, opacity: pressed ? 0.55 : 1 })}
      >
        <Typography variant="label" style={{ color: colors.text.accent }}>Close drafts</Typography>
      </Pressable>
    </Card>
  );
}

export default function DashboardScreen() {
  const routeParams = useLocalSearchParams<{
    draftSaved?: string | string[];
    goalFilter?: string | string[];
  }>();
  const { goals, isLoading: goalsLoading } = useGoals();
  const { session } = useSession();
  const momentum = useMomentumHomeSummary();
  const { projects, loadProjects } = useProjectStore();
  const [reflectionTimestamps, setReflectionTimestamps] =
    useState<ReflectionTimestampsByGoalId>({});

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
    loadProjects();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fire-and-forget: reconcile any unsummarized Echo entries in the background.
  // Home is the only caller; keep it when changing this screen.
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
  }, []);

  const draftGoals = useMemo(
    () => goals
      .filter((goal) => goal.status === 'draft')
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()),
    [goals],
  );
  const activeGoals = useMemo(() => selectActiveGoals(goals), [goals]);
  const activeGoalIdsKey = activeGoals.map((goal) => goal.id).join(',');

  useEffect(() => {
    const activeGoalIds = activeGoalIdsKey ? activeGoalIdsKey.split(',') : [];
    if (activeGoalIds.length === 0) {
      setReflectionTimestamps({});
      return;
    }

    let isActive = true;
    fetchActiveGoalReflectionTimestamps(activeGoalIds)
      .then((timestamps) => {
        if (isActive) setReflectionTimestamps(timestamps);
      })
      .catch(() => {
        if (isActive) setReflectionTimestamps({});
      });
    return () => {
      isActive = false;
    };
  }, [activeGoalIdsKey]);

  const todayGoals = useMemo(
    () => resolveActiveGoalProjectTitles(orderActiveGoals(activeGoals, reflectionTimestamps), projects),
    [activeGoals, projects, reflectionTimestamps],
  );

  const displayName = displayNameFromMetadata(session?.user.user_metadata)
    ?? displayNameFromEmail(session?.user.email);

  return (
    <>
      <CirclesScreen
        feedNotice={draftsRequested ? <DraftsCard drafts={draftGoals} /> : null}
        greeting={(
          <DashboardGreeting
            displayName={displayName}
            momentumLoading={momentum.isLoading}
            weeklyStreak={momentum.summary?.weeklyStreak ?? null}
          />
        )}
        todayFocus={goalsLoading ? <TodayFocusLoading /> : <TodayFocusSummary goals={todayGoals} />}
      />
      <Toast
        message="Saved as draft — pick it back up anytime"
        visible={draftToastVisible}
      />
    </>
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
