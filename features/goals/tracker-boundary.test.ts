import assert from 'node:assert/strict';
import test from 'node:test';
import type { Tracker } from './types.ts';
import { computeBoundaryDelayMs, earliestConfiguredPeriodEndEpoch } from './tracker-boundary.ts';

// Minimal tracker fixture — only the fields the boundary helpers read matter.
function tracker(endExclusive: Date | null): Tracker {
  return {
    periodState: endExclusive
      ? {
          asOf: new Date(),
          timezone: 'UTC',
          startInclusive: new Date(0),
          endExclusive,
          currentValue: 0,
          isCompleted: false,
          recentPeriods: [],
        }
      : null,
  } as unknown as Tracker;
}

test('earliest boundary is the minimum configured endExclusive; null when none configured', () => {
  const daily = tracker(new Date('2026-09-12T00:00:00.000Z'));
  const weekly = tracker(new Date('2026-09-14T00:00:00.000Z'));
  const nullCadence = tracker(null);

  assert.equal(
    earliestConfiguredPeriodEndEpoch([weekly, daily, nullCadence]),
    daily.periodState!.endExclusive.getTime(),
  );
  assert.equal(earliestConfiguredPeriodEndEpoch([nullCadence]), null);
  assert.equal(earliestConfiguredPeriodEndEpoch([]), null);
});

test('delay fires just after the earliest future boundary', () => {
  const now = new Date('2026-09-11T12:00:00.000Z');
  const end = new Date('2026-09-11T12:00:10.000Z'); // 10s out
  const delay = computeBoundaryDelayMs([tracker(end)], now, { padMs: 1000, minDelayMs: 1000 });
  assert.equal(delay, 10_000 + 1000);
});

test('an already-expired boundary yields the minimum delay so a refresh still happens soon', () => {
  const now = new Date('2026-09-11T12:00:00.000Z');
  const past = new Date('2026-09-11T11:59:00.000Z'); // 60s ago (period expired)
  const delay = computeBoundaryDelayMs([tracker(past)], now, { minDelayMs: 1000 });
  assert.equal(delay, 1000);
});

test('no configured boundary → no timer', () => {
  assert.equal(computeBoundaryDelayMs([tracker(null)], new Date()), null);
});
