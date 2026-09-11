import assert from 'node:assert/strict';
import test from 'node:test';
import { getRecentPeriodBounds } from './tracker-cadence.ts';
import {
  deriveTrackerPeriodState,
  RECENT_PERIOD_COUNT,
  type TrackerMeasure,
  type TrackerPeriodInput,
  type TrackerPeriodLog,
} from './tracker-period.ts';

const TZ = 'UTC';
// Wednesday 2026-08-05 12:00 UTC. In UTC the current periods are:
//   daily   [2026-08-05T00:00Z, 2026-08-06T00:00Z)
//   weekly  [2026-08-03T00:00Z, 2026-08-10T00:00Z)  (Monday-start)
//   monthly [2026-08-01T00:00Z, 2026-09-01T00:00Z)
const ASOF = new Date('2026-08-05T12:00:00.000Z');
const IN_CURRENT = new Date('2026-08-05T10:00:00.000Z'); // inside all three current periods

const FREQUENCIES = ['daily', 'weekly', 'monthly'] as const;

function log(loggedAt: Date, value = 1): TrackerPeriodLog {
  return { value, loggedAt };
}

function derive(input: TrackerPeriodInput, logs: TrackerPeriodLog[]) {
  return deriveTrackerPeriodState(input, logs, TZ, ASOF);
}

test('null-frequency tracker has no period state', () => {
  assert.equal(
    derive({ type: 'counter', frequency: null, targetValue: 5 }, [log(IN_CURRENT, 3)]),
    null,
  );
  assert.equal(
    derive({ type: 'habit', frequency: null, targetValue: null }, [log(IN_CURRENT)]),
    null,
  );
});

for (const frequency of FREQUENCIES) {
  test(`${frequency}: exactly seven contiguous buckets, current period last and containing asOf`, () => {
    const s = derive({ type: 'habit', frequency, targetValue: null }, [])!;
    assert.equal(s.recentPeriods.length, RECENT_PERIOD_COUNT);
    for (let i = 0; i < RECENT_PERIOD_COUNT - 1; i += 1) {
      assert.equal(
        s.recentPeriods[i].endExclusive.getTime(),
        s.recentPeriods[i + 1].startInclusive.getTime(),
      );
      assert.ok(
        s.recentPeriods[i].startInclusive.getTime() < s.recentPeriods[i + 1].startInclusive.getTime(),
      );
    }
    const current = s.recentPeriods[RECENT_PERIOD_COUNT - 1];
    assert.equal(current.startInclusive.getTime(), s.startInclusive.getTime());
    assert.equal(current.endExclusive.getTime(), s.endExclusive.getTime());
    assert.ok(ASOF.getTime() >= s.startInclusive.getTime() && ASOF.getTime() < s.endExclusive.getTime());
  });
}

// Presence completion: habit and checklist across all three cadences.
for (const type of ['habit', 'checklist'] as const satisfies readonly TrackerMeasure[]) {
  for (const frequency of FREQUENCIES) {
    test(`${type} ${frequency}: incomplete when empty, complete on one current-period log`, () => {
      const empty = derive({ type, frequency, targetValue: null }, [])!;
      assert.equal(empty.currentValue, 0);
      assert.equal(empty.isCompleted, false);
      assert.equal(empty.recentPeriods[RECENT_PERIOD_COUNT - 1].hasLog, false);

      const s = derive({ type, frequency, targetValue: null }, [log(IN_CURRENT)])!;
      assert.equal(s.currentValue, 1);
      assert.equal(s.isCompleted, true);
      assert.equal(s.recentPeriods[RECENT_PERIOD_COUNT - 1].hasLog, true);
    });
  }
}

// Counter completion vs. target across all three cadences: below / exactly at / above.
for (const frequency of FREQUENCIES) {
  test(`counter ${frequency}: below, exactly at, and above a positive target`, () => {
    const below = derive({ type: 'counter', frequency, targetValue: 5 }, [
      log(IN_CURRENT, 2),
      log(IN_CURRENT, 2),
    ])!;
    assert.equal(below.currentValue, 4);
    assert.equal(below.isCompleted, false);

    const at = derive({ type: 'counter', frequency, targetValue: 5 }, [log(IN_CURRENT, 5)])!;
    assert.equal(at.currentValue, 5);
    assert.equal(at.isCompleted, true);

    const above = derive({ type: 'counter', frequency, targetValue: 5 }, [
      log(IN_CURRENT, 3),
      log(IN_CURRENT, 4),
    ])!;
    assert.equal(above.currentValue, 7);
    assert.equal(above.isCompleted, true); // progress may exceed target
  });
}

test('counter with an absent or non-positive target never completes', () => {
  assert.equal(
    derive({ type: 'counter', frequency: 'daily', targetValue: null }, [log(IN_CURRENT, 9)])!.isCompleted,
    false,
  );
  assert.equal(
    derive({ type: 'counter', frequency: 'daily', targetValue: 0 }, [log(IN_CURRENT, 9)])!.isCompleted,
    false,
  );
});

test('multiple current-period logs are summed', () => {
  const s = derive({ type: 'counter', frequency: 'weekly', targetValue: 100 }, [
    log(IN_CURRENT, 3),
    log(new Date('2026-08-04T09:00:00.000Z'), 4), // Tuesday, same Monday-start week
    log(new Date('2026-08-03T00:00:00.000Z'), 5), // Monday 00:00, inclusive week start
  ])!;
  assert.equal(s.currentValue, 12);
});

test('daily bounds are half-open: start included, endExclusive excluded', () => {
  const start = new Date('2026-08-05T00:00:00.000Z');
  const end = new Date('2026-08-06T00:00:00.000Z');
  const s = derive({ type: 'counter', frequency: 'daily', targetValue: 100 }, [
    log(start, 1), // included (startInclusive)
    log(new Date(end.getTime() - 1), 1), // included (1ms before endExclusive)
    log(end, 100), // excluded (exactly endExclusive → next day, outside the window)
  ])!;
  assert.equal(s.currentValue, 2);
  assert.equal(s.recentPeriods[RECENT_PERIOD_COUNT - 1].value, 2);
});

test('a previous-period log fills its own bucket, not the current one (daily)', () => {
  const yesterday = new Date('2026-08-04T10:00:00.000Z');
  const s = derive({ type: 'counter', frequency: 'daily', targetValue: 100 }, [
    log(yesterday, 3),
    log(IN_CURRENT, 2),
  ])!;
  // 7 daily buckets ending Aug 5: Jul30..Aug5 → Aug 4 is index 5, Aug 5 is index 6.
  assert.equal(s.currentValue, 2);
  assert.equal(s.recentPeriods[6].value, 2);
  assert.equal(s.recentPeriods[5].value, 3);
  assert.equal(s.recentPeriods[5].hasLog, true);
});

test('one captured asOf is reused across trackers of different cadence', () => {
  const daily = derive({ type: 'habit', frequency: 'daily', targetValue: null }, [])!;
  const weekly = derive({ type: 'habit', frequency: 'weekly', targetValue: null }, [])!;
  const monthly = derive({ type: 'habit', frequency: 'monthly', targetValue: null }, [])!;
  for (const s of [daily, weekly, monthly]) {
    assert.equal(s.asOf.getTime(), ASOF.getTime());
    assert.ok(ASOF.getTime() >= s.startInclusive.getTime() && ASOF.getTime() < s.endExclusive.getTime());
  }
});

test('invalid timezone is normalized to UTC in the reported state', () => {
  const s = deriveTrackerPeriodState(
    { type: 'habit', frequency: 'daily', targetValue: null },
    [],
    'Not/AZone',
    ASOF,
  )!;
  assert.equal(s.timezone, 'UTC');
});

test('mixed-frequency read windows are distinct and ordered (daily narrowest, monthly widest)', () => {
  // Documents why the read path must batch per cadence: a monthly tracker must
  // not force seven months of daily logs to load.
  const daily = getRecentPeriodBounds('daily', ASOF, TZ, RECENT_PERIOD_COUNT)[0].startInclusive.getTime();
  const weekly = getRecentPeriodBounds('weekly', ASOF, TZ, RECENT_PERIOD_COUNT)[0].startInclusive.getTime();
  const monthly = getRecentPeriodBounds('monthly', ASOF, TZ, RECENT_PERIOD_COUNT)[0].startInclusive.getTime();
  assert.ok(daily > weekly && weekly > monthly);
});
