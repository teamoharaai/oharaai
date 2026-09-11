// Pure prior-phase achievement summary, derived from tracker_logs.
//
// When an expired goal is extended, its continuation records a snapshot of what
// the prior phase achieved. That snapshot used to read the stale
// `trackers.current_value` scalar, which tracker-metrics no longer writes. This
// reducer derives the same summary from the canonical log rows instead:
//   - counter  -> achieved = sum of log values in the phase window
//   - habit    -> completions = number of logs in the phase window
//   - checklist -> completions = number of logs in the phase window
//
// The caller supplies logs already bounded to the phase window and paginated
// (a phase can exceed the 1000-row response ceiling), so this stays pure and
// relative-import only (D-004).

import type { TrackerMeasure } from './tracker-period.ts';

export interface PhaseSummaryTracker {
  title: string;
  type: TrackerMeasure;
  targetValue: number | null;
}

export interface PhaseSummaryLog {
  trackerId: string;
  value: number;
}

export type PhaseSummaryItem =
  | { title: string; achieved: number; target: number | null }
  | { title: string; completions: number };

/**
 * Builds one summary item per tracker, in the given order. `logsByTracker` maps
 * a tracker id to its phase-window logs; missing means no logs (achieved 0 /
 * zero completions).
 */
export function buildPriorPhaseSummary(
  trackers: Array<{ id: string } & PhaseSummaryTracker>,
  logs: PhaseSummaryLog[],
): PhaseSummaryItem[] {
  const sumByTracker = new Map<string, number>();
  const countByTracker = new Map<string, number>();
  for (const log of logs) {
    sumByTracker.set(log.trackerId, (sumByTracker.get(log.trackerId) ?? 0) + log.value);
    countByTracker.set(log.trackerId, (countByTracker.get(log.trackerId) ?? 0) + 1);
  }

  return trackers.map((tracker) => {
    if (tracker.type === 'counter') {
      return {
        title: tracker.title,
        achieved: sumByTracker.get(tracker.id) ?? 0,
        target: tracker.targetValue,
      };
    }
    // habit + checklist: each period completion is one log.
    return {
      title: tracker.title,
      completions: countByTracker.get(tracker.id) ?? 0,
    };
  });
}
