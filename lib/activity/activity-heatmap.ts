// Goal-activity heatmap — pure week-grouping over the L1 window (design/001
// Part B "Render contract"). The GitHub-style heatmap is a second render of the
// SAME buildActivityWindow output (just a longer `days`); this helper only
// reshapes contiguous day buckets into Monday-aligned week columns and derives a
// discrete intensity level from each day's `count`. No DB, no timezone work.
//
// D-004: reached by a node test → relative paths + `import type` only.

import type { ActivityDayBucket } from './goal-activity.ts';
import { startOfIsoWeekYmd } from '../time/zoned-calendar.ts';

/** Number of discrete non-empty intensity levels (GitHub uses 4). */
export const HEATMAP_INTENSITY_LEVELS = 4;

/**
 * A weeks × weekday grid. `weeks` is oldest→newest (left→right); each week has
 * exactly 7 slots, Monday(index 0)→Sunday(index 6). Slots outside the actual
 * window (leading days before the first bucket, trailing days after the last)
 * are `null` so the grid stays rectangular without inventing history.
 */
export interface ActivityHeatmap {
  weeks: Array<Array<ActivityDayBucket | null>>;
  /** The largest `count` in the window; 0 when empty. Drives intensity scaling. */
  maxCount: number;
}

/**
 * Groups a contiguous oldest→newest day window into Monday-aligned weeks.
 *
 * Guarantees:
 * - Every returned week has exactly 7 slots (Mon→Sun); missing days are `null`.
 * - Buckets keep their input order and are never re-sorted or duplicated.
 * - An empty input yields `{ weeks: [], maxCount: 0 }`.
 */
export function groupBucketsIntoWeeks(
  buckets: readonly ActivityDayBucket[],
): ActivityHeatmap {
  if (buckets.length === 0) return { weeks: [], maxCount: 0 };

  // Pad the front so the first column is the Monday of the first bucket's week.
  const firstDate = buckets[0].date;
  const weekStart = startOfIsoWeekYmd(firstDate);
  const leadingPad = daysBetween(weekStart, firstDate);

  const slots: Array<ActivityDayBucket | null> = [];
  for (let i = 0; i < leadingPad; i += 1) slots.push(null);
  for (const bucket of buckets) slots.push(bucket);
  // Pad the tail so the final week is complete (Sunday-terminated).
  while (slots.length % 7 !== 0) slots.push(null);

  const weeks: Array<Array<ActivityDayBucket | null>> = [];
  for (let i = 0; i < slots.length; i += 7) {
    weeks.push(slots.slice(i, i + 7));
  }

  let maxCount = 0;
  for (const bucket of buckets) {
    if (bucket.count > maxCount) maxCount = bucket.count;
  }

  return { weeks, maxCount };
}

/** Whole-day distance from `fromYmd` to `toYmd` (assumes `from <= to`). */
function daysBetween(fromYmd: string, toYmd: string): number {
  const [fy, fm, fd] = fromYmd.split('-').map(Number);
  const [ty, tm, td] = toYmd.split('-').map(Number);
  const from = Date.UTC(fy, fm - 1, fd);
  const to = Date.UTC(ty, tm - 1, td);
  return Math.round((to - from) / 86_400_000);
}

/**
 * Discrete intensity level for one day: 0 (empty) or 1..HEATMAP_INTENSITY_LEVELS.
 * Buckets the `count` proportionally against the window's `maxCount` so the
 * ramp adapts to how active the goal is (GitHub-style). A positive count is
 * never level 0.
 */
export function heatmapIntensityLevel(count: number, maxCount: number): number {
  if (count <= 0) return 0;
  if (maxCount <= 1) return HEATMAP_INTENSITY_LEVELS;
  const scaled = Math.ceil((count / maxCount) * HEATMAP_INTENSITY_LEVELS);
  return Math.min(HEATMAP_INTENSITY_LEVELS, Math.max(1, scaled));
}
