// Pure Task 8 display derivation for the tracker card.
//
// DISPLAY is now driven off the log-derived `periodState` (Task 6 hydration),
// retiring the interim legacy-scalar read (`trackers.current_value`) that Tasks
// D-007/D-008 left in place. This module owns the small pieces of display logic
// worth testing in isolation — progress clamping, the seven-bucket habit history
// ordering, and the accessible period labels — mirroring the Task 6/7 split
// (tracker-optimism.ts / tracker-grouping.ts are pure + node-tested; the card is
// a thin shell).
//
// D-004: this module is reached by a node test, so it uses relative paths and
// `import type` only (erased at runtime). Do not add `@/` imports.

import type { TrackerPeriodBucket, TrackerPeriodState } from '../../lib/goals/tracker-period.ts';

/** How many period buckets the habit history renders — always exactly seven. */
export const HABIT_BUCKET_COUNT = 7;

type BucketFrequency = 'daily' | 'weekly' | 'monthly' | null;

/** A card-ready habit history dot. Buckets stay oldest -> newest, current last. */
export interface HabitBucketView {
  /** Stable key: the bucket start instant in ms (negative for empty placeholders). */
  key: number;
  /** Filled dot when the bucket has at least one log. */
  filled: boolean;
  /** The last bucket is the current period. */
  isCurrent: boolean;
  /** Accessible description of the bucket's date/week/month + whether it has a log. */
  accessibilityLabel: string;
}

/** DB-derived completion: a null/unhydrated period state is never authoritative-complete. */
export function isTrackerPeriodComplete(periodState: TrackerPeriodState | null): boolean {
  return periodState?.isCompleted ?? false;
}

/** Current-period value for counter/habit display; 0 when unhydrated or null cadence. */
export function currentPeriodValue(periodState: TrackerPeriodState | null): number {
  return periodState?.currentValue ?? 0;
}

/**
 * Counter progress as a 0–100 percentage of target, clamped so the bar never
 * over- or under-fills. A missing/zero target falls back to 1 (any progress
 * fills the bar), matching the completion rule in `deriveTrackerPeriodState`.
 */
export function counterProgressPercent(currentValue: number, targetValue: number | null): number {
  const target = typeof targetValue === 'number' && targetValue > 0 ? targetValue : 1;
  const pct = (currentValue / target) * 100;
  if (!Number.isFinite(pct)) return 0;
  return Math.min(100, Math.max(0, pct));
}

function formatBucketDate(date: Date, timezone: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('en-US', { timeZone: timezone, ...options }).format(date);
}

/** Human-readable period label for one bucket, keyed off the tracker's cadence. */
export function bucketPeriodLabel(
  bucket: TrackerPeriodBucket,
  frequency: BucketFrequency,
  timezone: string,
): string {
  const start = bucket.startInclusive;
  if (frequency === 'monthly') {
    return formatBucketDate(start, timezone, { month: 'long', year: 'numeric' });
  }
  if (frequency === 'weekly') {
    return `Week of ${formatBucketDate(start, timezone, { month: 'short', day: 'numeric' })}`;
  }
  // daily (and the null-cadence fallback) → a single date.
  return formatBucketDate(start, timezone, { month: 'short', day: 'numeric' });
}

function bucketAccessibilityLabel(
  bucket: TrackerPeriodBucket,
  frequency: BucketFrequency,
  timezone: string,
  isCurrent: boolean,
): string {
  const period = bucketPeriodLabel(bucket, frequency, timezone);
  const logState = bucket.hasLog ? 'logged' : 'no log';
  return `${period}${isCurrent ? ', current period' : ''}, ${logState}`;
}

/**
 * Card-ready habit history: exactly seven dots, oldest -> newest with the current
 * period last (the `deriveTrackerPeriodState` ordering, trusted, not re-sorted).
 * A dot is filled when its bucket has a log. When there is no period state (null
 * cadence or not-yet-hydrated) the row pads to seven empty placeholders so the
 * layout is stable without inventing history.
 */
export function habitBucketViews(
  periodState: TrackerPeriodState | null,
  frequency: BucketFrequency,
): HabitBucketView[] {
  const buckets = periodState?.recentPeriods ?? [];
  const timezone = periodState?.timezone ?? 'UTC';
  const views: HabitBucketView[] = buckets.map((bucket, index) => {
    const isCurrent = index === buckets.length - 1;
    return {
      key: bucket.startInclusive.getTime(),
      filled: bucket.hasLog,
      isCurrent,
      accessibilityLabel: bucketAccessibilityLabel(bucket, frequency, timezone, isCurrent),
    };
  });

  if (views.length >= HABIT_BUCKET_COUNT) {
    return views.slice(-HABIT_BUCKET_COUNT);
  }
  const padCount = HABIT_BUCKET_COUNT - views.length;
  const padding: HabitBucketView[] = Array.from({ length: padCount }, (_, index) => ({
    key: -1 - index,
    filled: false,
    isCurrent: false,
    accessibilityLabel: 'No history yet',
  }));
  return [...padding, ...views];
}
