import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { BrandIcon } from '@/components/ui/BrandIcon';
import { TodayCarousel, type TodayCarouselGoal } from '@/components/ui/TodayCarousel';
import { Toast } from '@/components/ui/Toast';
import { Typography } from '@/components/ui/Typography';
import { useGoals } from '@/features/goals/hooks/useGoals';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useLatestAction } from '@/features/actions/hooks/useLatestAction';
import { useEntries } from '@/features/echo/hooks/useEntries';
import { useProfileStore } from '@/features/profile/store';
import { useProjectStore } from '@/features/projects/store';
import { GoalRingGrid } from '@/features/goals/components/GoalRingGrid';
import { ProjectGoalRow } from '@/features/goals/components/ProjectGoalRow';
import { GoalTitleRow } from '@/features/goals/components/GoalTitleRow';
import { fetchActiveGoalsFeed } from '@/features/goals/services/goal-service';
import { CreateProjectModal } from '@/features/projects/components/CreateProjectModal';
import { ProjectCard } from '@/features/projects/components/ProjectCard';
import { FEATURES } from '@/constants/features';
import {
  DASHBOARD_DRAFTS_ROUTE,
  DASHBOARD_DRAFT_SAVED_PARAM,
  DASHBOARD_GOAL_FILTER_PARAM,
} from '@/lib/navigation/dashboard';
import { useThemeColors, useUIStore } from '@/store/uiStore';
import { authedFetch } from '@/lib/api/client';
import supabase from '@/lib/db/client';
import { formatRelativeTime } from '@/lib/utils/relativeTime';
import type { AiResponse } from '@/lib/ai/contracts';
import type { GoalWithDetails } from '@/features/goals/types';
import type { ActionLog } from '@/features/actions/types';

// --- Helpers ---

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getDateLabel(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function displayNameFromEmail(email: string | undefined): string | null {
  if (!email) return null;
  const local = email.split('@')[0];
  if (!local) return null;
  return local.charAt(0).toUpperCase() + local.slice(1);
}

function DashboardCreateButton({
  label,
  onPress,
}: {
  label: 'New Project' | 'New Goal';
  onPress: () => void;
}) {
  const colors = useThemeColors();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: colors.background.selectedRow,
        borderRadius: 999,
        opacity: pressed ? 0.72 : 1,
        paddingHorizontal: 12,
        paddingVertical: 7,
      })}
    >
      <Typography
        variant="emphasis-sm"
        style={{ color: colors.text.accent, fontSize: 13 }}
      >
        + {label}
      </Typography>
    </Pressable>
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
      <Pressable onPress={() => router.push(`/(app)/goals/${goal.id}` as never)}>
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
            onPress={() => router.push(`/(app)/goals/${goal.id}` as never)}
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

// --- Zone 2: Echo ---

interface EchoZoneProps {
  latestEntryContent: string | null;
  latestEntryDate: Date | null;
  echoLoading: boolean;
}

function EchoZone({
  latestEntryContent,
  latestEntryDate,
  echoLoading,
}: EchoZoneProps) {
  const colors = useThemeColors();

  return (
    <View
      className="rounded-2xl border p-5"
      style={{ backgroundColor: colors.background.card, borderColor: colors.border.divider }}
    >
      <Typography variant="eyebrow" className="mb-3">
        Echo
      </Typography>
      <Pressable
        className="mb-4 self-start rounded-full px-4 py-2.5"
        style={{ backgroundColor: colors.background.selectedRow }}
        onPress={() => router.push('/(app)/echo' as never)}
      >
        <Typography variant="emphasis-sm" style={{ color: colors.text.accent }}>
          Reflect in Echo
        </Typography>
      </Pressable>

      {echoLoading ? (
        <View
          className="h-3 w-1/2 rounded-full"
          style={{ backgroundColor: colors.background.subtle }}
        />
      ) : latestEntryContent && latestEntryDate ? (
        <View>
          <Typography
            variant="meta"
            className="mb-1.5"
            style={{ color: colors.text.accent }}
            numberOfLines={2}
          >
            {latestEntryContent.length > 100
              ? `${latestEntryContent.slice(0, 100)}\u2026`
              : latestEntryContent}
          </Typography>
          <Typography variant="caption">
            Last reflected: {formatRelativeTime(latestEntryDate.toISOString())}
          </Typography>
        </View>
      ) : (
        <Typography variant="meta" style={{ color: colors.text.muted }}>
          Your reflections will appear here.
        </Typography>
      )}
    </View>
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
        Keep reflecting in Echo — Ohara is learning about you.
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
  const routeParams = useLocalSearchParams<{
    draftSaved?: string | string[];
    goalFilter?: string | string[];
  }>();
  const { goals, isLoading: goalsLoading } = useGoals();
  const { user } = useAuth();
  const { projects, isLoading: projectsLoading, loadProjects } = useProjectStore();
  const { entries, isLoading: echoLoading } = useEntries();
  const standaloneGoalsView = useUIStore((state) => state.dashboardGoalsView);
  const setStandaloneGoalsView = useUIStore((state) => state.setDashboardGoalsView);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [activeGoalsFeed, setActiveGoalsFeed] = useState<TodayCarouselGoal[]>([]);
  const [activeGoalsLoading, setActiveGoalsLoading] = useState(true);
  const [showAllStandaloneGoals, setShowAllStandaloneGoals] = useState(false);

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
    let isActive = true;

    async function loadActiveGoalsFeed() {
      setActiveGoalsLoading(true);
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser || !isActive) return;

        const feed = await fetchActiveGoalsFeed(authUser.id);
        if (isActive) setActiveGoalsFeed(feed);
      } catch {
        if (isActive) setActiveGoalsFeed([]);
      } finally {
        if (isActive) setActiveGoalsLoading(false);
      }
    }

    void loadActiveGoalsFeed();
    return () => {
      isActive = false;
    };
  }, []);

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

  const hasProjects = projects.length > 0;

  const todayGoals = useMemo(
    () => activeGoalsFeed.map((goal) => ({
      ...goal,
      projectTitle: goal.projectId
        ? projects.find((project) => project.id === goal.projectId)?.title
        : undefined,
    })),
    [activeGoalsFeed, projects],
  );

  const latestEntry = entries[0] ?? null;

  const displayName = displayNameFromEmail(user?.email);
  const greeting = displayName
    ? `${getGreeting()}, ${displayName}.`
    : `${getGreeting()}.`;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.page }}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 40,
          paddingTop: 16,
        }}
      >
        {/* Header */}
        <View className="mb-6">
          <View>
            <Typography variant="greeting">
              {greeting}
            </Typography>
            <Typography variant="meta">
              {getDateLabel()}
            </Typography>
          </View>
        </View>

        {goalsLoading || projectsLoading || activeGoalsLoading ? (
          <DashboardSkeleton />
        ) : (
          <View className="gap-3">
            {/* Zone 1: Today's Focus */}
            <TodayCarousel goals={todayGoals} />

            {/* Zone 2: Projects */}
            <View>
              <View className="mb-4 flex-row items-center justify-between">
                <Typography variant="eyebrow">
                  Projects
                </Typography>
                <DashboardCreateButton
                  label="New Project"
                  onPress={() => setProjectModalOpen(true)}
                />
              </View>
              {hasProjects ? (
                projects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    goals={goals.filter((g) => g.projectId === project.id)}
                  />
                ))
              ) : (
                <Typography variant="hint">No projects yet.</Typography>
              )}
            </View>

            {/* Zone 3: Standalone Goals */}
            <View>
              <View className="mb-4 flex-row items-center justify-between">
                <View style={{ alignItems: 'center', flexDirection: 'row', gap: 6 }}>
                  <Typography variant="eyebrow">
                    {draftsRequested ? 'Drafts' : 'Goals'}
                  </Typography>
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
                      borderColor: colors.border.warm,
                      borderRadius: 999,
                      borderWidth: 1,
                      opacity: pressed ? 0.55 : 1,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
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
                      height: 26,
                      justifyContent: 'center',
                      opacity: pressed ? 0.55 : 1,
                      width: 34,
                    })}
                  >
                    <Ionicons
                      color={colors.text.accent}
                      name={standaloneGoalsView === 'list' ? 'grid-outline' : 'list-outline'}
                      size={16}
                    />
                  </Pressable>
                </View>
                <DashboardCreateButton
                  label="New Goal"
                  onPress={() => router.push('/goals/create')}
                />
              </View>
              {standaloneGoalsView === 'list' ? (
                visibleStandaloneGoals.length > 0 ? (
                  <View style={{ gap: 8 }}>
                    {visibleStandaloneGoals.map((goal) => (
                      <ProjectGoalRow key={goal.id} goal={goal} />
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
            </View>

            {/* Zone 4: Echo */}
            {FEATURES.ECHO_ENABLED ? (
              <EchoZone
                latestEntryContent={latestEntry?.content ?? null}
                latestEntryDate={latestEntry?.createdAt ?? null}
                echoLoading={echoLoading}
              />
            ) : null}

            {/* Zone 5: Intelligence */}
            <IntelligenceZone
              insight={cachedInsight}
              isLoading={insightLoading}
            />
          </View>
        )}
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
