import assert from 'node:assert/strict';
import test from 'node:test';
import { buildActivityWindow } from './goal-activity.ts';
import {
  HEATMAP_INTENSITY_LEVELS,
  groupBucketsIntoWeeks,
  heatmapIntensityLevel,
} from './activity-heatmap.ts';

test('groups a 7-day window into Monday-aligned weeks with leading/trailing pad', () => {
  // asOf 2026-09-16 (Wed) → dates 09-10(Thu)…09-16(Wed).
  const buckets = buildActivityWindow([], { asOfLocalDate: '2026-09-16', days: 7 });
  const { weeks } = groupBucketsIntoWeeks(buckets);

  assert.equal(weeks.length, 2);
  assert.ok(weeks.every((week) => week.length === 7));

  // Week 0: Mon..Wed are before the window → null; Thu = 09-10 (first bucket).
  assert.deepEqual(weeks[0].slice(0, 3).map((slot) => slot), [null, null, null]);
  assert.equal(weeks[0][3]?.date, '2026-09-10'); // Thursday column
  assert.equal(weeks[0][6]?.date, '2026-09-13'); // Sunday column

  // Week 1: Mon = 09-14 … Wed = 09-16 (today), then trailing null pad.
  assert.equal(weeks[1][0]?.date, '2026-09-14'); // Monday column
  assert.equal(weeks[1][2]?.date, '2026-09-16');
  assert.equal(weeks[1][2]?.isToday, true);
  assert.deepEqual(weeks[1].slice(3).map((slot) => slot), [null, null, null, null]);
});

test('buckets keep their order and are never duplicated', () => {
  const buckets = buildActivityWindow([], { asOfLocalDate: '2026-09-16', days: 21 });
  const { weeks } = groupBucketsIntoWeeks(buckets);
  const flattened = weeks.flat().filter((slot): slot is NonNullable<typeof slot> => slot !== null);
  assert.deepEqual(flattened.map((b) => b.date), buckets.map((b) => b.date));
});

test('maxCount reflects the busiest day in the window', () => {
  const buckets = buildActivityWindow([
    { goalId: 'g', kind: 'task_completed', localDate: '2026-09-14' },
    { goalId: 'g', kind: 'entry_created', localDate: '2026-09-14' },
    { goalId: 'g', kind: 'milestone_completed', localDate: '2026-09-16' },
  ], { asOfLocalDate: '2026-09-16', days: 7 });
  const { maxCount } = groupBucketsIntoWeeks(buckets);
  assert.equal(maxCount, 2);
});

test('an empty window yields no weeks', () => {
  assert.deepEqual(groupBucketsIntoWeeks([]), { weeks: [], maxCount: 0 });
});

test('intensity level: empty is 0, positive is never 0, scales against max', () => {
  assert.equal(heatmapIntensityLevel(0, 5), 0);
  assert.equal(heatmapIntensityLevel(1, 1), HEATMAP_INTENSITY_LEVELS); // max<=1 → full
  assert.equal(heatmapIntensityLevel(1, 4), 1);
  assert.equal(heatmapIntensityLevel(2, 4), 2);
  assert.equal(heatmapIntensityLevel(3, 4), 3);
  assert.equal(heatmapIntensityLevel(4, 4), HEATMAP_INTENSITY_LEVELS);
  assert.equal(heatmapIntensityLevel(99, 4), HEATMAP_INTENSITY_LEVELS); // capped
});
