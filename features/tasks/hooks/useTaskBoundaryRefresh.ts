import { useEffect, useMemo } from 'react';
import { AppState } from 'react-native';
import type { Task } from '../types';
import { earliestTaskBoundaryEpoch } from '../task-boundary';

const BOUNDARY_PAD_MS = 1000;
const MIN_DELAY_MS = 1000;

/**
 * Refreshes a goal's task list at its next local-day boundary and on app resume.
 *
 * Ported from the archived `useTrackerBoundaryRefresh`. Task sections
 * (today / upcoming / missed) are computed relative to `dateInTimeZone(tz, now)`,
 * so at midnight in a task's timezone the "today" set changes and pending
 * occurrences roll to missed. Without this, the panel shows a stale day until the
 * user navigates away and back.
 *
 * Three triggers, because a timer alone is unreliable on mobile/web (background
 * suspension can delay it arbitrarily):
 *   1. A timer set to the earliest next local midnight across the tasks'
 *      timezones (+pad). Recreated whenever that boundary moves and torn down on
 *      unmount / goal change.
 *   2. React Native app foreground (`AppState` → `active`).
 *   3. Web document visibility change and window focus.
 *
 * `refresh` must be stable (a `useCallback`) so these effects are not recreated
 * every render.
 */
export function useTaskBoundaryRefresh(tasks: readonly Task[], refresh: () => void): void {
  // Derive a stable primitive so the timer effect only re-runs when the boundary
  // actually moves — not on every optimistic occurrence patch. `now` is captured
  // when `tasks` changes; between changes the boundary is fixed until it fires,
  // and the ensuing reload changes `tasks` and recomputes the next boundary.
  const boundaryEpoch = useMemo(
    () => earliestTaskBoundaryEpoch(tasks, new Date()),
    [tasks],
  );

  useEffect(() => {
    if (boundaryEpoch === null) return;
    // Fire just after the boundary; clamp to a minimum so an already-past
    // boundary (suspended timer / clock skew) still refreshes soon rather than
    // never. The timer is never trusted alone — resume/visibility/focus also fire.
    const delay = Math.max(MIN_DELAY_MS, boundaryEpoch - Date.now() + BOUNDARY_PAD_MS);
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
