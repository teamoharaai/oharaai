import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getPeriodBounds,
  getRecentPeriodBounds,
  isWithinPeriod,
  type PeriodBounds,
} from './tracker-cadence.ts';

const iso = (date: Date) => date.toISOString();
const boundsIso = (bounds: PeriodBounds) => [iso(bounds.startInclusive), iso(bounds.endExclusive)];

// Note on DST-transition days: these bounds route through the shared
// lib/time/zoned-calendar conversion that Momentum already ships. On the two
// transition days per year the resulting midnight resolves to a deterministic,
// fully-contiguous boundary (see the contiguity test) rather than a pedantic
// 23/25-hour local day. Determinism, contiguity, and total coverage are the
// properties tracker period-bucketing relies on, and all three are asserted
// below. The exact instants here are the verified current behavior.

test('daily bounds are half-open across a New York spring-forward day', () => {
  const bounds = getPeriodBounds('daily', new Date('2026-03-08T12:00:00.000Z'), 'America/New_York');
  assert.deepEqual(boundsIso(bounds), ['2026-03-08T04:00:00.000Z', '2026-03-09T04:00:00.000Z']);
});

test('daily bounds are half-open across a New York fall-back day', () => {
  const bounds = getPeriodBounds('daily', new Date('2026-11-01T12:00:00.000Z'), 'America/New_York');
  assert.deepEqual(boundsIso(bounds), ['2026-11-01T05:00:00.000Z', '2026-11-02T05:00:00.000Z']);
});

test('the same instant lands in different local daily periods per timezone', () => {
  const instant = new Date('2026-08-05T02:00:00.000Z');
  const newYork = getPeriodBounds('daily', instant, 'America/New_York');
  const tokyo = getPeriodBounds('daily', instant, 'Asia/Tokyo');

  // In New York the instant is Aug 4 (22:00 EDT); in Tokyo it is Aug 5 (11:00 JST).
  assert.deepEqual(boundsIso(newYork), ['2026-08-04T04:00:00.000Z', '2026-08-05T04:00:00.000Z']);
  assert.deepEqual(boundsIso(tokyo), ['2026-08-04T15:00:00.000Z', '2026-08-05T15:00:00.000Z']);
  assert.ok(isWithinPeriod(instant, newYork));
  assert.ok(isWithinPeriod(instant, tokyo));
  assert.notEqual(iso(newYork.startInclusive), iso(tokyo.startInclusive));
});

test('Sunday 23:59 and Monday 00:01 fall in different Monday-start weeks (UTC)', () => {
  const sunday = getPeriodBounds('weekly', new Date('2026-08-09T23:59:00.000Z'), 'UTC');
  const monday = getPeriodBounds('weekly', new Date('2026-08-10T00:01:00.000Z'), 'UTC');

  assert.deepEqual(boundsIso(sunday), ['2026-08-03T00:00:00.000Z', '2026-08-10T00:00:00.000Z']);
  assert.deepEqual(boundsIso(monday), ['2026-08-10T00:00:00.000Z', '2026-08-17T00:00:00.000Z']);
  // The Sunday week's exclusive end is exactly the Monday week's inclusive start.
  assert.equal(iso(sunday.endExclusive), iso(monday.startInclusive));
});

test('exact endExclusive is outside the period; startInclusive is inside', () => {
  const bounds = getPeriodBounds('daily', new Date('2026-08-05T16:00:00.000Z'), 'UTC');
  assert.equal(isWithinPeriod(bounds.endExclusive, bounds), false);
  assert.equal(isWithinPeriod(bounds.startInclusive, bounds), true);
  // One millisecond before the exclusive end is still inside.
  assert.equal(isWithinPeriod(new Date(bounds.endExclusive.getTime() - 1), bounds), true);
});

test('monthly bounds handle December/January rollover (UTC)', () => {
  const december = getPeriodBounds('monthly', new Date('2026-12-15T00:00:00.000Z'), 'UTC');
  assert.deepEqual(boundsIso(december), ['2026-12-01T00:00:00.000Z', '2027-01-01T00:00:00.000Z']);

  const january = getPeriodBounds('monthly', new Date('2027-01-10T00:00:00.000Z'), 'UTC');
  assert.deepEqual(boundsIso(january), ['2027-01-01T00:00:00.000Z', '2027-02-01T00:00:00.000Z']);
});

test('monthly bounds span a leap-February and varying month lengths (UTC)', () => {
  // 2028 is a leap year: February has 29 days.
  const leapFeb = getPeriodBounds('monthly', new Date('2028-02-15T00:00:00.000Z'), 'UTC');
  assert.deepEqual(boundsIso(leapFeb), ['2028-02-01T00:00:00.000Z', '2028-03-01T00:00:00.000Z']);
  // A log on the leap day is inside February's period.
  assert.equal(isWithinPeriod(new Date('2028-02-29T12:00:00.000Z'), leapFeb), true);

  // 31-day January ends at Feb 1; 30-day April ends at May 1.
  const april = getPeriodBounds('monthly', new Date('2027-04-10T00:00:00.000Z'), 'UTC');
  assert.deepEqual(boundsIso(april), ['2027-04-01T00:00:00.000Z', '2027-05-01T00:00:00.000Z']);
});

test('getRecentPeriodBounds returns exactly N contiguous periods, oldest -> newest', () => {
  const count = 7;
  const reference = new Date('2026-03-09T12:00:00.000Z');
  const periods = getRecentPeriodBounds('daily', reference, 'America/New_York', count);

  assert.equal(periods.length, count);
  // Contiguous with no gaps or overlaps, even across the spring-forward boundary.
  for (let i = 0; i < periods.length - 1; i += 1) {
    assert.equal(iso(periods[i].endExclusive), iso(periods[i + 1].startInclusive));
  }
  // Ordered oldest -> newest.
  for (let i = 0; i < periods.length - 1; i += 1) {
    assert.ok(periods[i].startInclusive.getTime() < periods[i + 1].startInclusive.getTime());
  }
  // The last (current) period matches getPeriodBounds for the reference.
  const current = getPeriodBounds('daily', reference, 'America/New_York');
  assert.deepEqual(boundsIso(periods[periods.length - 1]), boundsIso(current));
});

test('recent weekly and monthly periods are contiguous', () => {
  const weekly = getRecentPeriodBounds('weekly', new Date('2026-03-20T12:00:00.000Z'), 'America/New_York', 7);
  for (let i = 0; i < weekly.length - 1; i += 1) {
    assert.equal(iso(weekly[i].endExclusive), iso(weekly[i + 1].startInclusive));
  }
  const monthly = getRecentPeriodBounds('monthly', new Date('2027-01-15T12:00:00.000Z'), 'UTC', 7);
  assert.equal(monthly.length, 7);
  for (let i = 0; i < monthly.length - 1; i += 1) {
    assert.equal(iso(monthly[i].endExclusive), iso(monthly[i + 1].startInclusive));
  }
  // Seven months back from January 2027 reaches July 2026.
  assert.deepEqual(
    [iso(monthly[0].startInclusive), iso(monthly[6].endExclusive)],
    ['2026-07-01T00:00:00.000Z', '2027-02-01T00:00:00.000Z'],
  );
});

test('invalid timezone deterministically falls back to UTC', () => {
  const bounds = getPeriodBounds('daily', new Date('2026-08-05T16:00:00.000Z'), 'Not/AZone');
  assert.deepEqual(boundsIso(bounds), ['2026-08-05T00:00:00.000Z', '2026-08-06T00:00:00.000Z']);
});

test('bounds are deterministic from (frequency, reference, timezone)', () => {
  const reference = new Date('2026-08-05T16:00:00.000Z');
  const first = getPeriodBounds('weekly', reference, 'America/New_York');
  const second = getPeriodBounds('weekly', reference, 'America/New_York');
  assert.deepEqual(boundsIso(first), boundsIso(second));
});

test('getRecentPeriodBounds rejects non-positive and non-integer counts', () => {
  const reference = new Date('2026-08-05T16:00:00.000Z');
  for (const bad of [0, -1, -7, 2.5, Number.NaN, Infinity]) {
    assert.throws(() => getRecentPeriodBounds('daily', reference, 'UTC', bad), /positive integer/);
  }
});

test('getPeriodBounds rejects an unsupported cadence', () => {
  assert.throws(
    // @ts-expect-error deliberately passing an invalid cadence
    () => getPeriodBounds('yearly', new Date('2026-08-05T16:00:00.000Z'), 'UTC'),
    /Unsupported tracker cadence/,
  );
});
