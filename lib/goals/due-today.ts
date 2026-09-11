// Pure, timezone-aware derivation of a daily tracker's "due today" state.
//
// The dashboard due-today card only needs the CURRENT daily period, not a
// seven-bucket history. Given a daily tracker's metadata, its logs (already
// fetched inside the current daily window server-side, but re-filtered here for
// safety), an IANA timezone, and one captured `asOf` instant, this returns the
// current-period value, the log-derived completion verdict, and the period's
// half-open end. `tracker_logs` is the sole evidence — `trackers.current_value`
// is never consulted, and completion is never compared against the browser's
// local clock.
//
// Completion mirrors the settled semantics used by `deriveTrackerPeriodState`:
//   - counter → sum of current-period log values >= a positive `targetValue`.
//   - checklist / habit → at least one log in the current daily period.
//
// D-004: reachable from node --experimental-strip-types tests, so every import
// is relative (no `@/` alias).

import { getPeriodBounds, isWithinPeriod } from './tracker-cadence.ts';
import type { TrackerMeasure, TrackerPeriodLog } from './tracker-period.ts';
import { normalizeTimezone } from '../time/zoned-calendar.ts';

/** The daily tracker metadata the derivation needs — never its stored scalar. */
export interface DueTodayTrackerMeta {
  type: TrackerMeasure;
  targetValue: number | null;
}

export interface DueTodayState {
  currentPeriodValue: number;
  isCompletedThisPeriod: boolean;
  periodEndExclusive: Date;
}

/**
 * Derives one daily tracker's current-period due-today state.
 *
 * The daily window is `getPeriodBounds('daily', asOf, timezone)` — the same
 * DST/timezone-aware bound the mutation core uses — so a browser/device timezone
 * differing from `profiles.timezone` never changes the result. Logs are summed
 * over that half-open window; a counter completes only at/above a positive
 * target, a habit/checklist completes on any presence.
 */
export function deriveDueTodayState(
  meta: DueTodayTrackerMeta,
  logs: TrackerPeriodLog[],
  timezone: string,
  asOf: Date,
): DueTodayState {
  const zone = normalizeTimezone(timezone);
  const bounds = getPeriodBounds('daily', asOf, zone);

  let currentPeriodValue = 0;
  let hasLog = false;
  for (const log of logs) {
    if (isWithinPeriod(log.loggedAt, bounds)) {
      currentPeriodValue += log.value;
      hasLog = true;
    }
  }

  const target = meta.targetValue;
  const isCompletedThisPeriod = meta.type === 'counter'
    ? typeof target === 'number' && target > 0 && currentPeriodValue >= target
    : hasLog;

  return {
    currentPeriodValue,
    isCompletedThisPeriod,
    periodEndExclusive: bounds.endExclusive,
  };
}
