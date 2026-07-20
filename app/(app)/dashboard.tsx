import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { BrandIcon } from '@/components/ui/BrandIcon';
import { Typography } from '@/components/ui/Typography';
import { useGoals } from '@/features/goals/hooks/useGoals';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useLatestAction } from '@/features/actions/hooks/useLatestAction';
import { useEntries } from '@/features/echo/hooks/useEntries';
import { useProfileStore } from '@/features/profile/store';
import { useProjectStore } from '@/features/projects/store';
import { GoalRingGrid } from '@/features/goals/components/GoalRingGrid';
import { GoalTitleRow } from '@/features/goals/components/GoalTitleRow';
import { CreateProjectModal } from '@/features/projects/components/CreateProjectModal';
import { ProjectCard } from '@/features/projects/components/ProjectCard';
import { FEATURES } from '@/constants/features';
import { useThemeColors } from '@/store/uiStore';
import { authedFetch } from '@/lib/api/client';
import type { AiResponse } from '@/lib/ai/contracts';
import type { GoalWithMeasurables } from '@/features/goals/types';
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

function getRelativeDays(date: Date): string {
  const diffDays = Math.floor(
    (new Date().getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return '1 day ago';
  return `${diffDays} days ago`;
}

// --- Zone 1: Today's Measurables ---

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
  measurables: Array<{
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
        const res = await authedFetch('/api/measurables/due-today');
        if (!res.ok || !isActive) return;
        const body = (await res.json()) as { data: DueTodayApiGroup[] };
        if (!isActive) return;
        setItems(
          body.data.flatMap((group) =>
            group.measurables.map((m) => ({
              goalId: group.goalId,
              goalTitle: group.goalTitle,
              id: m.id,
              title: m.title,
              lastCompletedAt: m.lastCompletedAt,
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
      const res = await authedFetch('/api/goals/complete-measurable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ measurableId: item.id, goalId: item.goalId }),
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
        <View className="mb-4 h-2.5 w-16 rounded-full bg-[#EAE7E0]" />
        {[0, 1].map((i) => (
          <View key={i} className="mb-3 flex-row items-center gap-3">
            <View className="h-5 w-5 rounded-full bg-[#EAE7E0]" />
            <View className="flex-1 gap-2">
              <View className="h-2 w-14 rounded-full bg-[#F0EDE6]" />
              <View className="h-3 w-3/4 rounded-full bg-[#EAE7E0]" />
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
                className={`h-6 w-6 items-center justify-center rounded-full border-2 ${
                  done ? 'border-[#1E3226]' : 'border-[#C9D4CD]'
                }`}
              >
                {done && (
                  <Text className="text-xs font-inter-semibold text-[#1E3226]">✓</Text>
                )}
                {completing && !done && (
                  <View className="h-2 w-2 rounded-full bg-[#C9D4CD]" />
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
  goal: GoalWithMeasurables;
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
            <View className="h-3 w-3/5 rounded-full bg-[#EAE7E0]" />
            <View className="h-3 w-4/5 rounded-full bg-[#F0EDE6]" />
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
                className={`flex-1 items-center rounded-full py-2.5 ${
                  isMutating ? 'bg-[#C9D4CD]' : 'bg-[#1E3226]'
                }`}
                onPress={() => void handleUpdateStatus('complete')}
                disabled={isMutating}
              >
                <Typography variant="emphasis-sm" className="text-white">
                  {isMutating ? 'Saving…' : 'Complete'}
                </Typography>
              </TouchableOpacity>
              <TouchableOpacity
                className={`flex-1 items-center rounded-full border py-2.5 ${
                  isMutating
                    ? 'border-[#E5E7EB] bg-[#F7F4EE]'
                    : 'border-[#EAE7E0] bg-[#F8F6F1]'
                }`}
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
        className="self-start rounded-full bg-[#1E3226] px-4 py-2.5"
        onPress={() => router.push('/goals/create')}
      >
        <Typography variant="emphasis-sm" className="text-[#EDE7DA]">
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
        <View className="h-3 w-1/2 rounded-full bg-[#EAE7E0]" />
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
            Last reflected: {getRelativeDays(latestEntryDate)}
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
        <View className="h-3 w-3/4 rounded-full bg-[#E0DDD6]" />
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
          <View className="mb-3 h-2.5 w-20 rounded-full bg-[#EAE7E0]" />
          <View className="mb-2 h-5 w-3/4 rounded-lg bg-[#F0EDE6]" />
          <View className="h-3 w-1/2 rounded-full bg-[#F0EDE6]" />
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
  const { goals, isLoading: goalsLoading } = useGoals();
  const { user } = useAuth();
  const { projects, isLoading: projectsLoading, loadProjects } = useProjectStore();
  const { entries, isLoading: echoLoading } = useEntries();
  const [projectModalOpen, setProjectModalOpen] = useState(false);

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
    () => goals.filter((g) => g.projectId === null),
    [goals],
  );

  const hasProjects = projects.length > 0;

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

        {goalsLoading || projectsLoading ? (
          <DashboardSkeleton />
        ) : (
          <View className="gap-3">
            {/* Zone 1: Today's Measurables */}
            <DueTodayZone />

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
                <Typography variant="eyebrow">
                  Goals
                </Typography>
                <DashboardCreateButton
                  label="New Goal"
                  onPress={() => router.push('/goals/create')}
                />
              </View>
              <GoalRingGrid
                goals={standaloneGoals}
                emptyMessage="No standalone goals yet."
              />
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
      <CreateProjectModal
        visible={projectModalOpen}
        onClose={() => setProjectModalOpen(false)}
      />
    </SafeAreaView>
  );
}
