import { useEffect } from 'react';
import { useAuthStore } from '@/features/auth/store';
import { useGoalStore } from '../store';
import { fetchGoals } from '../services/goal-service';
import supabase from '@/lib/db/client';
import { startPerformanceTimer, type LoadPhase } from '@/lib/diagnostics/performance';
import type { GoalStatus } from '../types';

/**
 * Stale-while-revalidate window. Within this window after a successful load, a
 * remount renders the cached goals instantly with NO network request. Older
 * than this, the cached goals still render immediately (no loading spinner)
 * while a background revalidation refreshes them.
 *
 * This is safe against a user's own writes: goal mutations update the store
 * directly (upsertGoal / deleteGoal), so the cache never lags local changes.
 * Only out-of-band changes (another device, a server-side reconcile) wait up to
 * this window to appear.
 */
const STALE_MS = 30_000;

// Module-level SWR coordination. The Zustand goal store IS the cache; these
// track its freshness and dedupe concurrent loads across simultaneous mounts.
// The cache key is `${userId}:${status}` so a user switch never matches the
// previous user's cache (the store isn't cleared on logout).
let lastCacheKey: string | null = null;
let lastLoadedAt = 0;
let inFlight: Promise<void> | null = null;
let inFlightKey: string | null = null;

export function useGoals(options?: { status?: GoalStatus }) {
  const goals = useGoalStore((state) => state.goals);
  const isLoading = useGoalStore((state) => state.isLoading);
  const userId = useAuthStore((state) => state.session?.user.id ?? null);
  const requestedStatus = options?.status;

  useEffect(() => {
    const cacheKey = `${userId ?? 'anon'}:${requestedStatus ?? 'active'}`;
    const { setGoals, setIsLoading } = useGoalStore.getState();

    const cacheMatches = lastCacheKey === cacheKey && lastLoadedAt > 0;
    const isFresh = cacheMatches && Date.now() - lastLoadedAt < STALE_MS;

    // Fresh cache for this user + status → render it, skip the network entirely.
    if (isFresh) {
      if (useGoalStore.getState().isLoading) setIsLoading(false);
      return;
    }

    // Only show the loading state when we have nothing to render for this
    // user + status. A stale-but-present cache stays on screen while we
    // revalidate.
    if (!cacheMatches) setIsLoading(true);

    let cancelled = false;

    async function revalidate() {
      // Dedupe: if a load for this same user + status is already in flight,
      // join it instead of firing a second identical request.
      if (inFlight && inFlightKey === cacheKey) {
        await inFlight;
        return;
      }

      inFlightKey = cacheKey;
      inFlight = (async () => {
        const phase: LoadPhase =
          useGoalStore.getState().goals.length === 0 ? 'initial-load' : 'refresh';
        const timing = startPerformanceTimer('goals.load', { phase });
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            timing.end({ success: true, resultCount: 0, requestCount: 1 });
            return;
          }
          const data = await fetchGoals(
            user.id,
            requestedStatus ? { status: requestedStatus } : undefined,
          );
          setGoals(data);
          lastCacheKey = cacheKey;
          lastLoadedAt = Date.now();
          timing.end({ success: true, resultCount: data.length, requestCount: 2 });
        } catch (error) {
          timing.end({ success: false, requestCount: 2 });
          throw error;
        }
      })();

      try {
        await inFlight;
      } finally {
        if (inFlightKey === cacheKey) {
          inFlight = null;
          inFlightKey = null;
        }
      }
    }

    revalidate()
      .catch((error) => {
        console.warn('useGoals load failed:', error);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [requestedStatus, userId]);

  return { goals, isLoading };
}
