import { useEffect, useState } from 'react';
import { useAuthStore } from '@/features/auth/store';
import { fetchHomeSummary, type HomeSummary } from '../services/home-summary-service';
import type { ReflectionTimestampsByGoalId } from '../active-goal-selectors';
import type { WeeklyTaskCountsByGoal } from '../services/weekly-task-count-service';

/**
 * Stale-while-revalidate cache for the Home aggregator (`/api/home/summary`),
 * mirroring the module-cache pattern of `useMomentumHomeSummary`. Once loaded
 * for a user, remounts serve from the module cache with no refetch, so
 * navigating back to Home is instant. Keyed by userId so a user switch never
 * serves the previous user's signals. Failure degrades to empty maps (counts /
 * ordering hints are simply omitted — never a wrong number).
 */
type State = {
  isLoading: boolean;
  summary: HomeSummary | null;
};

const EMPTY_WEEKLY: WeeklyTaskCountsByGoal = {};
const EMPTY_REFLECTIONS: ReflectionTimestampsByGoalId = {};
const EMPTY_SUMMARY: HomeSummary = {
  weeklyTaskCounts: EMPTY_WEEKLY,
  reflectionTimestamps: EMPTY_REFLECTIONS,
};

let cache: State = { isLoading: false, summary: null };
let cacheUserId: string | null = null;
let pendingRequest: Promise<void> | null = null;
let requestGeneration = 0;
const listeners = new Set<(state: State) => void>();

function publish(next: State) {
  cache = next;
  for (const listener of listeners) listener(cache);
}

function resetCache(userId: string | null) {
  requestGeneration += 1;
  cacheUserId = userId;
  pendingRequest = null;
  publish({ isLoading: Boolean(userId), summary: null });
}

async function load(userId: string | null, force = false): Promise<void> {
  if (!userId) {
    if (cacheUserId !== null || cache.isLoading || cache.summary) resetCache(null);
    return;
  }
  if (cacheUserId !== userId) resetCache(userId);
  if (!force && cache.summary) return;
  if (pendingRequest) return pendingRequest;

  const generation = requestGeneration;
  publish({ ...cache, isLoading: true });
  pendingRequest = (async () => {
    try {
      const summary = await fetchHomeSummary();
      if (generation !== requestGeneration || cacheUserId !== userId) return;
      publish({ isLoading: false, summary });
    } catch {
      if (generation !== requestGeneration || cacheUserId !== userId) return;
      publish({ isLoading: false, summary: EMPTY_SUMMARY });
    } finally {
      if (generation === requestGeneration) pendingRequest = null;
    }
  })();
  return pendingRequest;
}

// Best-effort refresh after a mutation that could change this week's Task counts
// or reflection ordering (e.g. checking off a Task). Callers do not await it.
export async function refreshHomeSummaryAfterMutation(): Promise<void> {
  const userId = cacheUserId ?? useAuthStore.getState().session?.user.id ?? null;
  if (!userId) return;
  await load(userId, true);
}

export function useHomeSummary(): {
  isLoading: boolean;
  weeklyTaskCounts: WeeklyTaskCountsByGoal;
  reflectionTimestamps: ReflectionTimestampsByGoalId;
} {
  const userId = useAuthStore((state) => state.session?.user.id ?? null);
  const [state, setState] = useState<State>(() =>
    cacheUserId === userId ? cache : { isLoading: Boolean(userId), summary: null },
  );

  useEffect(() => {
    if (cacheUserId !== userId) resetCache(userId);
    listeners.add(setState);
    setState(cache);
    void load(userId);
    return () => {
      listeners.delete(setState);
    };
  }, [userId]);

  return {
    isLoading: state.isLoading,
    weeklyTaskCounts: state.summary?.weeklyTaskCounts ?? EMPTY_WEEKLY,
    reflectionTimestamps: state.summary?.reflectionTimestamps ?? EMPTY_REFLECTIONS,
  };
}
