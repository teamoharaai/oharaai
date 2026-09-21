import type { ActivityDayBucket } from '@/lib/activity/goal-activity';

// Mon→Sun single-letter initials, indexed by (isoWeekday - 1).
const WEEKDAY_INITIALS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;

export interface DailyActivityTrend {
  /** Last 7 daily event counts, oldest→newest (today last). */
  points: number[];
  /** Weekday initial under each point. */
  labels: string[];
  /** Total events across the last 7 days. */
  total: number;
  /** Total events across the 7 days before that (the comparison week). */
  previousTotal: number;
  /** total − previousTotal: positive means more active than last week. */
  delta: number;
  /** Whether there is any data at all in the two-week comparison span. */
  hasData: boolean;
}

/**
 * Derives a "last 7 days" daily series plus a week-over-week comparison from the
 * contiguous goal-activity window (buildActivityWindow guarantees one bucket per
 * day, today last). Pure — no fetching, safe to unit-test.
 */
export function buildDailyActivityTrend(buckets: readonly ActivityDayBucket[]): DailyActivityTrend {
  const last7 = buckets.slice(-7);
  const previous7 = buckets.slice(-14, -7);
  const points = last7.map((bucket) => bucket.count);
  const labels = last7.map((bucket) => WEEKDAY_INITIALS[bucket.isoWeekday - 1] ?? '');
  const total = points.reduce((sum, value) => sum + value, 0);
  const previousTotal = previous7.reduce((sum, bucket) => sum + bucket.count, 0);
  return {
    points,
    labels,
    total,
    previousTotal,
    delta: total - previousTotal,
    hasData: last7.length > 0 && (total > 0 || previousTotal > 0),
  };
}
