import assert from 'node:assert/strict';
import test from 'node:test';
import { getPeriodBounds } from './tracker-cadence.ts';
import type { TrackerPeriodLog } from './tracker-period.ts';
import { deriveDueTodayState, type DueTodayTrackerMeta } from './due-today.ts';

// Wednesday 2026-08-05 12:00 UTC.
const ASOF = new Date('2026-08-05T12:00:00.000Z');

function log(loggedAt: Date, value = 1): TrackerPeriodLog {
  return { value, loggedAt };
}

test('periodEndExclusive is the daily window end in the given timezone', () => {
  const utc = deriveDueTodayState({ type: 'habit', targetValue: null }, [], 'UTC', ASOF);
  assert.equal(utc.periodEndExclusive.toISOString(), '2026-08-06T00:00:00.000Z');

  // The bound matches the shared cadence utility exactly (no re-implementation).
  const expected = getPeriodBounds('daily', ASOF, 'UTC');
  assert.equal(utc.periodEndExclusive.getTime(), expected.endExclusive.getTime());
});

test('the daily window is evaluated in profiles.timezone, not the process/browser zone', () => {
  // At 2026-08-05T12:00Z it is 2026-08-05 21:00 in Tokyo (UTC+9): the current
  // Tokyo day is [2026-08-04T15:00Z, 2026-08-05T15:00Z).
  // A log at 2026-08-04T20:00Z is inside the Tokyo day (still the 5th locally)
  // even though it falls on the PREVIOUS UTC calendar day — a naive UTC-day
  // "today" check would wrongly exclude it.
  const tokyo = deriveDueTodayState(
    { type: 'habit', targetValue: null },
    [log(new Date('2026-08-04T20:00:00.000Z'))],
    'Asia/Tokyo',
    ASOF,
  );
  assert.equal(tokyo.periodEndExclusive.toISOString(), '2026-08-05T15:00:00.000Z');
  assert.equal(tokyo.isCompletedThisPeriod, true);
  assert.equal(tokyo.currentPeriodValue, 1);

  // A log at 16:00Z is past the Tokyo day's end (next local day) → not today.
  const nextDay = deriveDueTodayState(
    { type: 'habit', targetValue: null },
    [log(new Date('2026-08-05T16:00:00.000Z'))],
    'Asia/Tokyo',
    ASOF,
  );
  assert.equal(nextDay.isCompletedThisPeriod, false);
  assert.equal(nextDay.currentPeriodValue, 0);
});

test('an invalid timezone falls back to UTC deterministically', () => {
  const bad = deriveDueTodayState({ type: 'habit', targetValue: null }, [], 'Not/AZone', ASOF);
  assert.equal(bad.periodEndExclusive.toISOString(), '2026-08-06T00:00:00.000Z');
});

test('habit/checklist complete on any presence in the current daily period', () => {
  for (const type of ['habit', 'checklist'] as const) {
    const meta: DueTodayTrackerMeta = { type, targetValue: null };
    assert.equal(deriveDueTodayState(meta, [], 'UTC', ASOF).isCompletedThisPeriod, false);
    const done = deriveDueTodayState(meta, [log(new Date('2026-08-05T10:00:00.000Z'))], 'UTC', ASOF);
    assert.equal(done.isCompletedThisPeriod, true);
    assert.equal(done.currentPeriodValue, 1);
  }
});

test('counter completes only at or above a positive target, summing current-period logs', () => {
  const meta: DueTodayTrackerMeta = { type: 'counter', targetValue: 3 };
  const logs = [
    log(new Date('2026-08-05T08:00:00.000Z')),
    log(new Date('2026-08-05T09:00:00.000Z')),
  ];
  // Two of three: below target → not complete, but value reflects the sum.
  const below = deriveDueTodayState(meta, logs, 'UTC', ASOF);
  assert.equal(below.currentPeriodValue, 2);
  assert.equal(below.isCompletedThisPeriod, false);

  // A third log reaches the target.
  const atTarget = deriveDueTodayState(
    meta,
    [...logs, log(new Date('2026-08-05T11:00:00.000Z'))],
    'UTC',
    ASOF,
  );
  assert.equal(atTarget.currentPeriodValue, 3);
  assert.equal(atTarget.isCompletedThisPeriod, true);
});

test('a counter with no positive target never completes', () => {
  const zeroTarget = deriveDueTodayState(
    { type: 'counter', targetValue: 0 },
    [log(new Date('2026-08-05T08:00:00.000Z'), 5)],
    'UTC',
    ASOF,
  );
  assert.equal(zeroTarget.isCompletedThisPeriod, false);
  const nullTarget = deriveDueTodayState(
    { type: 'counter', targetValue: null },
    [log(new Date('2026-08-05T08:00:00.000Z'), 5)],
    'UTC',
    ASOF,
  );
  assert.equal(nullTarget.isCompletedThisPeriod, false);
});

test('logs outside the current daily period are ignored', () => {
  // Yesterday (UTC) and tomorrow (UTC) both fall outside today's window.
  const meta: DueTodayTrackerMeta = { type: 'counter', targetValue: 1 };
  const outside = deriveDueTodayState(
    meta,
    [
      log(new Date('2026-08-04T23:59:59.000Z')),
      log(new Date('2026-08-06T00:00:00.000Z')),
    ],
    'UTC',
    ASOF,
  );
  assert.equal(outside.currentPeriodValue, 0);
  assert.equal(outside.isCompletedThisPeriod, false);
});

test('DST spring-forward day: window stays deterministic and contiguous (D-005)', () => {
  // US spring-forward 2026: 2026-03-08 in America/New_York. asOf mid-day.
  const springAsOf = new Date('2026-03-08T17:00:00.000Z'); // ~12:00 EST/EDT-ish
  const state = deriveDueTodayState(
    { type: 'habit', targetValue: null },
    [],
    'America/New_York',
    springAsOf,
  );
  const expected = getPeriodBounds('daily', springAsOf, 'America/New_York');
  // The pure module derives exactly the shared bound — no idealized 23h span is
  // assumed; the transition-hour handling belongs to the shared calendar (D-005).
  assert.equal(state.periodEndExclusive.getTime(), expected.endExclusive.getTime());
});
