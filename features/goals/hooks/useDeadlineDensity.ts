import { useEffect, useState } from 'react';
import { useAuthStore } from '@/features/auth/store';
import { fetchDeadlineDensity } from '../services/deadline-density-service';
import type { DeadlineDensity } from '../services/deadline-density-service';

/**
 * Stale-while-revalidate cache for the cross-goal deadline aggregator
 * (`/api/deadlines`), mirroring `useHomeSummary`. Once loaded for a user,
 * remounts serve from the module cache with no refetch, so opening a date
 * picker is instant. Keyed by userId so a user switch never serves the previous
 * user's deadlines. Failure degrades to an empty map (an empty calendar — never
 * a wrong count).
 */
type State = {
  isLoading: boolean;
  density: DeadlineDensity | null;
};

const EMPTY_DENSITY: DeadlineDensity = {};

let cache: State = { isLoading: false, density: null };
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
  publish({ isLoading: Boolean(userId), density: null });
}

async function load(userId: string | null, force = false): Promise<void> {
  if (!userId) {
    if (cacheUserId !== null || cache.isLoading || cache.density) resetCache(null);
    return;
  }
  if (cacheUserId !== userId) resetCache(userId);
  if (!force && cache.density) return;
  if (pendingRequest) return pendingRequest;

  const generation = requestGeneration;
  publish({ ...cache, isLoading: true });
  pendingRequest = (async () => {
    try {
      const density = await fetchDeadlineDensity();
      if (generation !== requestGeneration || cacheUserId !== userId) return;
      publish({ isLoading: false, density });
    } catch {
      if (generation !== requestGeneration || cacheUserId !== userId) return;
      publish({ isLoading: false, density: EMPTY_DENSITY });
    } finally {
      if (generation === requestGeneration) pendingRequest = null;
    }
  })();
  return pendingRequest;
}

/**
 * Best-effort refresh after a mutation that could change deadline density (a
 * milestone/Task deadline added, edited, completed, or archived). Callers do not
 * await it.
 */
export async function refreshDeadlineDensityAfterMutation(): Promise<void> {
  const userId = cacheUserId ?? useAuthStore.getState().session?.user.id ?? null;
  if (!userId) return;
  await load(userId, true);
}

export function useDeadlineDensity(): { isLoading: boolean; density: DeadlineDensity } {
  const userId = useAuthStore((state) => state.session?.user.id ?? null);
  const [state, setState] = useState<State>(() =>
    cacheUserId === userId ? cache : { isLoading: Boolean(userId), density: null },
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
    density: state.density ?? EMPTY_DENSITY,
  };
}
