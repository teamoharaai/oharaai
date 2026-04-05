import { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { useGoals } from '@/features/goals/hooks/useGoals';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useLatestAction } from '@/features/actions/hooks/useLatestAction';
import { useEntries } from '@/features/echo/hooks/useEntries';
import { useProfileStore } from '@/features/profile/store';
import { useProjectStore } from '@/features/projects/store';
import { GoalGrid } from '@/features/goals/components/GoalGrid';
import { ProjectCard } from '@/features/projects/components/ProjectCard';
import { FEATURES } from '@/constants/features';
import supabase from '@/lib/db/client';
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

function getRelativeDays(date: Date): string {
  const diffDays = Math.floor(
    (new Date().getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return '1 day ago';
  return `${diffDays} days ago`;
}

async function getAccessToken(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Not authenticated');
  return session.access_token;
}

// --- Zone 1: Active Goal + Next Action ---

interface ActiveGoalCardProps {
  goal: GoalWithMeasurables;
}

function ActiveGoalCard({ goal }: ActiveGoalCardProps) {
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
      const token = await getAccessToken();
      const res = await fetch(`/api/actions/${current.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
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
    <View className="rounded-2xl border border-[#EAE7E0] bg-white p-5">
      <Pressable onPress={() => router.push(`/goals/${goal.id}`)}>
        <Text className="mb-2 font-sans text-[11px] font-medium uppercase tracking-[1.5px] text-[#6B7B6E]">
          Active Goal
        </Text>
        <Text className="mb-4 font-sans text-[17px] font-semibold leading-6 text-[#1A1F1C]">
          {goal.title}
        </Text>
      </Pressable>

      <View className="border-t border-[#F0EDE6] pt-4">
        <Text className="mb-3 font-sans text-[11px] font-medium uppercase tracking-[1.5px] text-[#6B7B6E]">
          Next Action
        </Text>

        {mutationError ? (
          <Text className="mb-2 text-xs text-[#B45309]">{mutationError}</Text>
        ) : null}

        {actionLoading && optimisticAction === undefined ? (
          <View className="gap-2">
            <View className="h-3 w-3/5 rounded-full bg-[#EAE7E0]" />
            <View className="h-3 w-4/5 rounded-full bg-[#F0EDE6]" />
          </View>
        ) : actionError && optimisticAction === undefined ? (
          <Text className="text-sm text-[#92400E]">
            Couldn&apos;t load next action.
          </Text>
        ) : displayedAction ? (
          <View>
            <Text className="mb-4 font-sans text-[15px] leading-[22px] text-[#1A1F1C]">
              {displayedAction.action_text}
            </Text>
            <View className="flex-row gap-3">
              <TouchableOpacity
                className={`flex-1 items-center rounded-full py-2.5 ${
                  isMutating ? 'bg-[#C9D4CD]' : 'bg-[#3D5247]'
                }`}
                onPress={() => void handleUpdateStatus('complete')}
                disabled={isMutating}
              >
                <Text className="text-sm font-semibold text-white">
                  {isMutating ? 'Saving…' : 'Complete'}
                </Text>
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
                <Text className="text-sm font-medium text-[#6B7B6E]">Skip</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <Pressable
            className="self-start rounded-full bg-[#EEF4F0] px-4 py-2"
            onPress={() => router.push(`/goals/${goal.id}`)}
          >
            <Text className="text-sm font-semibold text-[#3D5247]">
              Set next action
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function NoActiveGoalCard() {
  return (
    <View className="rounded-2xl border border-[#EAE7E0] bg-white p-5">
      <Text className="mb-2 font-sans text-[11px] font-medium uppercase tracking-[1.5px] text-[#6B7B6E]">
        Active Goal
      </Text>
      <Text className="mb-4 font-sans text-[15px] text-[#6B7B6E]">
        No active goal yet.
      </Text>
      <Pressable
        className="self-start rounded-full bg-[#3D5247] px-4 py-2.5"
        onPress={() => router.push('/goals/create')}
      >
        <Text className="text-sm font-semibold text-[#E8EDE9]">
          Create a goal
        </Text>
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
  return (
    <View className="rounded-2xl border border-[#EAE7E0] bg-white p-5">
      <Text className="mb-3 font-sans text-[11px] font-medium uppercase tracking-[1.5px] text-[#6B7B6E]">
        Echo
      </Text>
      <Pressable
        className="mb-4 self-start rounded-full bg-[#EEF4F0] px-4 py-2.5"
        onPress={() => router.push('/(app)/echo' as never)}
      >
        <Text className="text-sm font-semibold text-[#3D5247]">
          Reflect in Echo
        </Text>
      </Pressable>

      {echoLoading ? (
        <View className="h-3 w-1/2 rounded-full bg-[#EAE7E0]" />
      ) : latestEntryContent && latestEntryDate ? (
        <View>
          <Text
            className="mb-1.5 font-sans text-[13px] leading-5 text-[#4A5C4E]"
            numberOfLines={2}
          >
            {latestEntryContent.length > 100
              ? `${latestEntryContent.slice(0, 100)}\u2026`
              : latestEntryContent}
          </Text>
          <Text className="font-sans text-xs text-[#9CAF9F]">
            Last reflected: {getRelativeDays(latestEntryDate)}
          </Text>
        </View>
      ) : (
        <Text className="font-sans text-[13px] leading-5 text-[#9CAF9F]">
          Your reflections will appear here.
        </Text>
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
  if (isLoading) {
    return (
      <View className="rounded-2xl bg-[#F0EDE6] px-5 py-4">
        <View className="h-3 w-3/4 rounded-full bg-[#E0DDD6]" />
      </View>
    );
  }

  if (insight) {
    return (
      <View className="rounded-2xl border border-[#EAE7E0] bg-white p-5">
        <Text className="mb-2 font-sans text-[11px] font-medium uppercase tracking-[1.5px] text-[#6B7B6E]">
          Intelligence
        </Text>
        <Text className="font-sans text-[14px] leading-[21px] text-[#1A1F1C]">
          {insight}
        </Text>
      </View>
    );
  }

  return (
    <View className="rounded-2xl bg-[#F0EDE6] px-5 py-4">
      <Text className="text-center font-sans text-[13px] leading-5 text-[#9CAF9F]">
        Keep reflecting in Echo — Ohara is learning about you.
      </Text>
    </View>
  );
}

// --- Skeleton for initial load ---

function DashboardSkeleton() {
  return (
    <View className="gap-3">
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          className="rounded-2xl border border-[#EAE7E0] bg-white p-5"
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
  const { goals, isLoading: goalsLoading } = useGoals();
  const { user } = useAuth();
  const { projects, isLoading: projectsLoading, loadProjects } = useProjectStore();
  const { entries, isLoading: echoLoading } = useEntries();

  useEffect(() => {
    loadProjects();
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
        const token = await getAccessToken();
        const res = await fetch('/api/intelligence', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });

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

  const activeGoal = useMemo<GoalWithMeasurables | null>(
    () =>
      [...goals]
        .filter((g) => g.status === 'active')
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0] ??
      null,
    [goals],
  );

  const standaloneGoals = useMemo(
    () => goals.filter((g) => g.projectId === null),
    [goals],
  );

  const newestId = useMemo(
    () =>
      goals.length > 0
        ? [...goals].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0]?.id
        : undefined,
    [goals],
  );

  const hasProjects = projects.length > 0;

  const latestEntry = entries[0] ?? null;

  const displayName = displayNameFromEmail(user?.email);
  const greeting = displayName
    ? `${getGreeting()}, ${displayName}.`
    : `${getGreeting()}.`;

  return (
    <SafeAreaView className="flex-1 bg-[#F5F1EA]">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 40,
          paddingTop: 16,
        }}
      >
        {/* Header */}
        <View className="mb-6 flex-row items-start justify-between">
          <View>
            <Text className="font-sans text-[22px] font-medium text-[#1A1F1C]">
              {greeting}
            </Text>
            <Text className="font-sans text-[13px] text-[#6B7B6E]">
              {getDateLabel()}
            </Text>
          </View>
          <Pressable
            className="pl-2 pt-0.5"
            onPress={() => router.push('/projects/create')}
          >
            <Text className="text-[22px] leading-7 text-[#4A7C5F]">+</Text>
          </Pressable>
        </View>

        {goalsLoading || projectsLoading ? (
          <DashboardSkeleton />
        ) : (
          <View className="gap-3">
            {/* Zone 1: Active Goal + Next Action */}
            {activeGoal ? (
              <ActiveGoalCard goal={activeGoal} />
            ) : (
              <NoActiveGoalCard />
            )}

            {/* Zone 2: Projects */}
            <View>
              <View className="mb-4 flex-row items-center justify-between">
                <Text className="font-sans text-[11px] font-medium uppercase tracking-[1.5px] text-[#6B7B6E]">
                  Projects
                </Text>
                <Pressable onPress={() => router.push('/projects/create')}>
                  <Text className="text-[20px] leading-6 text-[#4A7C5F]">+</Text>
                </Pressable>
              </View>
              {hasProjects && projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </View>

            {/* Zone 3: All Goals */}
            {standaloneGoals.length > 0 && (
              <View>
                <View className="mb-4 flex-row items-center justify-between">
                  <Text className="font-sans text-[11px] font-medium uppercase tracking-[1.5px] text-[#6B7B6E]">
                    Goals
                  </Text>
                  <Pressable onPress={() => router.push('/goals/create')}>
                    <Text className="text-[20px] leading-6 text-[#4A7C5F]">+</Text>
                  </Pressable>
                </View>
                <GoalGrid goals={standaloneGoals} newestId={newestId} />
              </View>
            )}

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
    </SafeAreaView>
  );
}
