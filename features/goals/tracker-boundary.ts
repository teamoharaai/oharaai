// Pure helpers for Task 6 cadence-boundary refresh.
//
// A goal's derived tracker state goes stale at the earliest configured period
// boundary among its trackers (e.g. a daily tracker rolls over before a weekly
// one). These pure functions compute WHEN to refresh; the effect wiring (timer +
// RN foreground + web visibility/focus) lives in useTrackerBoundaryRefresh.
//
// D-004: type-only import (erased), so this stays node-testable.

import type { Tracker } from './types.ts';

/**
 * The earliest configured `periodState.endExclusive` (as an epoch ms) across a
 * goal's trackers, or `null` when no tracker has a hydrated period state (null
 * cadence, or detail not yet hydrated). Only configured cadences have a boundary.
 */
export function earliestConfiguredPeriodEndEpoch(trackers: readonly Tracker[]): number | null {
  let earliest: number | null = null;
  for (const tracker of trackers) {
    const end = tracker.periodState?.endExclusive;
    if (!end) continue;
    const epoch = end.getTime();
    if (!Number.isFinite(epoch)) continue;
    if (earliest === null || epoch < earliest) earliest = epoch;
  }
  return earliest;
}

/**
 * Milliseconds until the next boundary refresh should fire, or `null` when there
 * is no configured boundary to watch. Fires just AFTER the boundary (`padMs`) so
 * the refreshed read lands in the new period. If the boundary is already past
 * (suspended timer, clock skew), returns `minDelayMs` so a refresh happens soon
 * rather than never — the timer is never trusted alone (resume/focus also fire).
 */
export function computeBoundaryDelayMs(
  trackers: readonly Tracker[],
  now: Date,
  options: { padMs?: number; minDelayMs?: number } = {},
): number | null {
  const padMs = options.padMs ?? 1000;
  const minDelayMs = options.minDelayMs ?? 1000;
  const earliest = earliestConfiguredPeriodEndEpoch(trackers);
  if (earliest === null) return null;
  const delay = earliest - now.getTime() + padMs;
  return Math.max(minDelayMs, delay);
}
