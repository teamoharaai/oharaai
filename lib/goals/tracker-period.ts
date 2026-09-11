// Pure, timezone-aware derivation of a tracker's period state from its logs.
//
// `tracker_logs` is the canonical evidence for period progress and completion;
// `trackers.current_value` is never consulted here. Given a tracker's metadata,
// its bounded log rows, an IANA timezone, and one captured `asOf` instant, this
// module deterministically produces the seven most recent period buckets
// (oldest -> newest, current period last) plus the current-period value and
// completion verdict. All bucket math routes through the shared cadence
// utilities so DST, month length, and year rollover stay consistent with
// Momentum.
//
// D-004: this module is reachable from node --experimental-strip-types tests,
// so every import is relative (no `@/` alias).

import {
  getRecentPeriodBounds,
  isWithinPeriod,
  type TrackerCadence,
} from './tracker-cadence.ts';
import { normalizeTimezone } from '../time/zoned-calendar.ts';

/** How many period buckets a tracker's history renders. */
export const RECENT_PERIOD_COUNT = 7;

export type TrackerMeasure = 'counter' | 'habit' | 'checklist';

export interface TrackerPeriodBucket {
  startInclusive: Date;
  endExclusive: Date;
  value: number;
  hasLog: boolean;
}

export interface TrackerPeriodState {
  asOf: Date;
  timezone: string;
  startInclusive: Date;
  endExclusive: Date;
  currentValue: number;
  isCompleted: boolean;
  recentPeriods: TrackerPeriodBucket[]; // exactly RECENT_PERIOD_COUNT, oldest -> newest
}

/** The tracker metadata the derivation needs — never its stored current_value. */
export interface TrackerPeriodInput {
  type: TrackerMeasure;
  frequency: TrackerCadence | null;
  targetValue: number | null;
}

/** A single decoded log row; `value` and `loggedAt` are already primitives. */
export interface TrackerPeriodLog {
  value: number;
  loggedAt: Date;
}

/**
 * Derives the seven-bucket period state for one tracker.
 *
 * Returns `null` when cadence is not configured (`frequency === null`): such a
 * tracker has no period concept and must not be presented as complete/incomplete.
 *
 * Completion (settled semantics):
 *  - checklist / habit → at least one log in the current period.
 *  - counter → sum of current-period log values >= a positive `targetValue`.
 */
export function deriveTrackerPeriodState(
  tracker: TrackerPeriodInput,
  logs: TrackerPeriodLog[],
  timezone: string,
  asOf: Date,
): TrackerPeriodState | null {
  if (tracker.frequency === null) return null;

  const zone = normalizeTimezone(timezone);
  const bounds = getRecentPeriodBounds(tracker.frequency, asOf, zone, RECENT_PERIOD_COUNT);

  const recentPeriods: TrackerPeriodBucket[] = bounds.map((period) => {
    let value = 0;
    let hasLog = false;
    for (const log of logs) {
      if (isWithinPeriod(log.loggedAt, period)) {
        value += log.value;
        hasLog = true;
      }
    }
    return {
      startInclusive: period.startInclusive,
      endExclusive: period.endExclusive,
      value,
      hasLog,
    };
  });

  const current = recentPeriods[recentPeriods.length - 1];
  const currentValue = current.value;
  const target = tracker.targetValue;
  const isCompleted = tracker.type === 'counter'
    ? typeof target === 'number' && target > 0 && currentValue >= target
    : current.hasLog;

  return {
    asOf,
    timezone: zone,
    startInclusive: current.startInclusive,
    endExclusive: current.endExclusive,
    currentValue,
    isCompleted,
    recentPeriods,
  };
}
