import assert from 'node:assert/strict';
import test from 'node:test';

import {
  HABIT_BUCKET_COUNT,
  bucketPeriodLabel,
  counterProgressPercent,
  currentPeriodValue,
  habitBucketViews,
  isTrackerPeriodComplete,
} from './tracker-display.ts';
import type { TrackerPeriodBucket, TrackerPeriodState } from '../../lib/goals/tracker-period.ts';

// Build a bucket whose start is `dayOffset` days after a fixed anchor. Buckets
// are handed to the display layer already oldest -> newest (current last), the
// `deriveTrackerPeriodState` contract; these fixtures preserve that ordering.
const ANCHOR = Date.UTC(2026, 8, 1); // 2026-09-01 UTC
function bucket(dayOffset: number, hasLog: boolean, value = hasLog ? 1 : 0): TrackerPeriodBucket {
  const start = new Date(ANCHOR + dayOffset * 86_400_000);
  const end = new Date(ANCHOR + (dayOffset + 1) * 86_400_000);
  return { startInclusive: start, endExclusive: end, value, hasLog };
}

function periodState(
  recentPeriods: TrackerPeriodBucket[],
  overrides: Partial<TrackerPeriodState> = {},
): TrackerPeriodState {
  const current = recentPeriods[recentPeriods.length - 1];
  return {
    asOf: new Date(ANCHOR),
    timezone: 'UTC',
    startInclusive: current.startInclusive,
    endExclusive: current.endExclusive,
    currentValue: current.value,
    isCompleted: current.hasLog,
    recentPeriods,
    ...overrides,
  };
}

test('counterProgressPercent clamps below, at, and above target', () => {
  assert.equal(counterProgressPercent(2, 10), 20); // below target
  assert.equal(counterProgressPercent(10, 10), 100); // at target
  assert.equal(counterProgressPercent(25, 10), 100); // above target, capped
  assert.equal(counterProgressPercent(0, 10), 0);
});

test('counterProgressPercent handles missing/zero target and non-finite', () => {
  // No/zero target falls back to 1, so any progress fills the bar (matches the
  // completion rule in deriveTrackerPeriodState).
  assert.equal(counterProgressPercent(1, null), 100);
  assert.equal(counterProgressPercent(0, null), 0);
  assert.equal(counterProgressPercent(5, 0), 100);
  assert.equal(counterProgressPercent(Number.NaN, 10), 0);
});

test('currentPeriodValue and completion never treat null period state as authoritative', () => {
  assert.equal(currentPeriodValue(null), 0);
  assert.equal(isTrackerPeriodComplete(null), false);
  const state = periodState([bucket(0, true, 3)]);
  assert.equal(currentPeriodValue(state), 3);
  assert.equal(isTrackerPeriodComplete(state), true);
  assert.equal(isTrackerPeriodComplete(periodState([bucket(0, false)])), false);
});

test('habitBucketViews yields exactly seven dots, current period last', () => {
  const buckets = Array.from({ length: HABIT_BUCKET_COUNT }, (_, i) => bucket(i, false));
  const views = habitBucketViews(periodState(buckets), 'daily');
  assert.equal(views.length, HABIT_BUCKET_COUNT);
  // Only the last view is the current period.
  assert.equal(views[HABIT_BUCKET_COUNT - 1].isCurrent, true);
  for (let i = 0; i < HABIT_BUCKET_COUNT - 1; i += 1) {
    assert.equal(views[i].isCurrent, false);
  }
  // Ordering is preserved oldest -> newest (ascending start keys).
  for (let i = 1; i < views.length; i += 1) {
    assert.ok(views[i].key > views[i - 1].key);
  }
});

test('daily habit logged today fills exactly the current (last) bucket', () => {
  const buckets = Array.from({ length: HABIT_BUCKET_COUNT }, (_, i) =>
    bucket(i, i === HABIT_BUCKET_COUNT - 1),
  );
  const views = habitBucketViews(periodState(buckets), 'daily');
  assert.equal(views[HABIT_BUCKET_COUNT - 1].filled, true);
  assert.equal(views[HABIT_BUCKET_COUNT - 1].isCurrent, true);
  for (let i = 0; i < HABIT_BUCKET_COUNT - 1; i += 1) {
    assert.equal(views[i].filled, false);
  }
});

test('weekly/monthly current-period fill follows the same current-last rule', () => {
  const weekly = habitBucketViews(
    periodState(Array.from({ length: 7 }, (_, i) => bucket(i * 7, i === 6))),
    'weekly',
  );
  assert.equal(weekly[6].filled, true);
  assert.equal(weekly[6].isCurrent, true);

  const monthly = habitBucketViews(
    periodState(Array.from({ length: 7 }, (_, i) => bucket(i * 30, i === 6))),
    'monthly',
  );
  assert.equal(monthly[6].filled, true);
  assert.equal(monthly[6].isCurrent, true);
});

test('habitBucketViews pads to seven empty dots when period state is null', () => {
  const views = habitBucketViews(null, null);
  assert.equal(views.length, HABIT_BUCKET_COUNT);
  assert.ok(views.every((view) => !view.filled && !view.isCurrent));
  assert.ok(views.every((view) => view.accessibilityLabel === 'No history yet'));
  // Placeholder keys are unique so React does not collide them.
  assert.equal(new Set(views.map((view) => view.key)).size, HABIT_BUCKET_COUNT);
});

test('habitBucketViews keeps only the seven most recent when handed more', () => {
  const buckets = Array.from({ length: 9 }, (_, i) => bucket(i, false));
  const views = habitBucketViews(periodState(buckets), 'daily');
  assert.equal(views.length, HABIT_BUCKET_COUNT);
  // Kept the newest seven → first kept is the third input bucket (offset 2).
  assert.equal(views[0].key, buckets[2].startInclusive.getTime());
  assert.equal(views[HABIT_BUCKET_COUNT - 1].key, buckets[8].startInclusive.getTime());
});

test('bucket labels describe date / week / month and log presence', () => {
  const logged = bucket(10, true); // 2026-09-11 UTC
  const empty = bucket(10, false);

  assert.equal(bucketPeriodLabel(logged, 'daily', 'UTC'), 'Sep 11');
  assert.equal(bucketPeriodLabel(logged, 'weekly', 'UTC'), 'Week of Sep 11');
  assert.equal(bucketPeriodLabel(logged, 'monthly', 'UTC'), 'September 2026');
  // Null cadence falls back to a single date.
  assert.equal(bucketPeriodLabel(logged, null, 'UTC'), 'Sep 11');

  // Accessible label surfaces log presence + current-period marker.
  const views = habitBucketViews(periodState([empty, logged]), 'daily');
  const current = views[views.length - 1];
  assert.match(current.accessibilityLabel, /Sep 11/);
  assert.match(current.accessibilityLabel, /current period/);
  assert.match(current.accessibilityLabel, /logged/);
  const prior = views[views.length - 2];
  assert.match(prior.accessibilityLabel, /no log/);
});
