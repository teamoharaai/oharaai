import { useEffect, useMemo } from 'react';
import { AppState } from 'react-native';
import type { Tracker } from '../types';
import { computeBoundaryDelayMs, earliestConfiguredPeriodEndEpoch } from '../tracker-boundary';

/**
 * Refreshes the selected goal's tracker state at its cadence boundary.
 *
 * Three triggers, because a timer alone is unreliable on mobile/web (background
 * suspension can delay it arbitrarily):
 *   1. A timer set to the earliest configured `periodState.endExclusive` (+pad).
 *      It is recreated whenever that boundary changes and torn down on unmount /
 *      goal change (the boundary epoch is derived from `trackers`, which resets
 *      to a new reference when the selected goal changes).
 *   2. React Native app foreground (`AppState` → `active`).
 *   3. Web document visibility change and window focus.
 *
 * `refresh` must be stable (a `useCallback`) so these effects are not recreated
 * every render.
 */
export function useTrackerBoundaryRefresh(
  trackers: readonly Tracker[],
  refresh: () => void,
): void {
  // Derive a stable primitive so the timer effect only re-runs when the boundary
  // actually moves — not on every optimistic tracker patch (which changes the
  // `trackers` array reference but usually not the earliest boundary).
  const boundaryEpoch = useMemo(
    () => earliestConfiguredPeriodEndEpoch(trackers),
    [trackers],
  );

  useEffect(() => {
    if (boundaryEpoch === null) return;
    const delay = computeBoundaryDelayMs(
      // Reconstruct a minimal tracker list carrying just the boundary so the
      // shared pure helper computes the delay from `now` at effect time.
      [{ periodState: { endExclusive: new Date(boundaryEpoch) } } as unknown as Tracker],
      new Date(),
    );
    if (delay === null) return;
    const timer = setTimeout(refresh, delay);
    return () => clearTimeout(timer);
  }, [boundaryEpoch, refresh]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') refresh();
    });

    // Web: also refresh when the tab becomes visible or regains focus.
    const hasDocument = typeof document !== 'undefined';
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    const onFocus = () => refresh();
    if (hasDocument) {
      document.addEventListener('visibilitychange', onVisibility);
      window.addEventListener('focus', onFocus);
    }

    return () => {
      subscription.remove();
      if (hasDocument) {
        document.removeEventListener('visibilitychange', onVisibility);
        window.removeEventListener('focus', onFocus);
      }
    };
  }, [refresh]);
}
