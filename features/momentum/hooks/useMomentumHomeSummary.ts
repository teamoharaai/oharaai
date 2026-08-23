import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/features/auth/store';
import { authedFetch } from '@/lib/api/client';
import type { GoalMomentumSummary, MomentumHomeSummary } from '../types';

type MomentumResponse = { data?: MomentumHomeSummary; error?: string };
type CacheState = {
  error: string | null;
  isLoading: boolean;
  summary: MomentumHomeSummary | null;
};

let cache: CacheState = { error: null, isLoading: false, summary: null };
let pendingRequest: Promise<void> | null = null;
let cacheUserId: string | null = null;
let requestGeneration = 0;
const listeners = new Set<(state: CacheState) => void>();

function publish(next: CacheState) {
  cache = next;
  for (const listener of listeners) listener(cache);
}

function resetCache(userId: string | null) {
  requestGeneration += 1;
  cacheUserId = userId;
  pendingRequest = null;
  publish({ error: null, isLoading: Boolean(userId), summary: null });
}

async function loadMomentum(userId: string | null, force = false): Promise<void> {
  if (!userId) {
    if (cacheUserId !== null || cache.isLoading || cache.summary || cache.error) resetCache(null);
    return;
  }
  if (cacheUserId !== userId) resetCache(userId);
  if (!force && cache.summary) return;
  if (pendingRequest) {
    if (!force) return pendingRequest;
    await pendingRequest;
    return loadMomentum(userId, true);
  }
  const generation = requestGeneration;
  publish({ ...cache, error: null, isLoading: true });
  pendingRequest = (async () => {
    try {
      const response = await authedFetch('/api/momentum');
      const payload = (await response.json()) as MomentumResponse;
      if (!response.ok || !payload.data) throw new Error(payload.error ?? 'Momentum is unavailable');
      if (generation !== requestGeneration || cacheUserId !== userId) return;
      publish({ error: null, isLoading: false, summary: payload.data });
    } catch (loadError) {
      if (generation !== requestGeneration || cacheUserId !== userId) return;
      publish({
        error: loadError instanceof Error ? loadError.message : 'Momentum is unavailable',
        isLoading: false,
        summary: null,
      });
    } finally {
      if (generation === requestGeneration) pendingRequest = null;
    }
  })();
  return pendingRequest;
}

// Domain writes remain authoritative and independent. This best-effort refresh
// only asks the trusted API to recalculate the open week after a meaningful
// persisted mutation; callers intentionally do not await or roll back on it.
export async function refreshMomentumAfterMeaningfulMutation(): Promise<void> {
  const userId = cacheUserId ?? useAuthStore.getState().session?.user.id ?? null;
  if (!userId) return;
  await loadMomentum(userId, true);
}

export function useMomentumHomeSummary(): CacheState & { refresh: () => Promise<void> } {
  const userId = useAuthStore((state) => state.session?.user.id ?? null);
  const [state, setState] = useState<CacheState>(() =>
    cacheUserId === userId ? cache : { error: null, isLoading: Boolean(userId), summary: null }
  );
  const refresh = useCallback(() => loadMomentum(userId, true), [userId]);
  useEffect(() => {
    if (cacheUserId !== userId) resetCache(userId);
    listeners.add(setState);
    setState(cache);
    void loadMomentum(userId);
    return () => { listeners.delete(setState); };
  }, [userId]);
  return { ...state, refresh };
}

export function useGoalMomentumSummary(goalId: string | null | undefined): CacheState & {
  goalSummary: GoalMomentumSummary | null;
  refresh: () => Promise<void>;
} {
  const state = useMomentumHomeSummary();
  return {
    ...state,
    goalSummary: state.summary?.goals.find((goal) => goal.goalId === goalId) ?? null,
  };
}
