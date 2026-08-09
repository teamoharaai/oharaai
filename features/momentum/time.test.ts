import assert from 'node:assert/strict';
import test from 'node:test';
import { getMomentumWeek, getPreviousMomentumWeek } from './time.ts';

test('New York week uses Monday through Sunday local boundaries', () => {
  const week = getMomentumWeek(new Date('2026-08-05T16:00:00.000Z'), 'America/New_York');
  assert.equal(week.weekStart, '2026-08-03');
  assert.equal(week.weekEnd, '2026-08-09');
  assert.equal(week.startInclusive, '2026-08-03T04:00:00.000Z');
  assert.equal(week.endExclusive, '2026-08-10T04:00:00.000Z');
});

test('positive UTC offsets preserve the same local calendar week', () => {
  const week = getMomentumWeek(new Date('2026-08-05T16:00:00.000Z'), 'Asia/Tokyo');
  assert.equal(week.weekStart, '2026-08-03');
  assert.equal(week.startInclusive, '2026-08-02T15:00:00.000Z');
});

test('DST boundaries use the offset active at each local midnight', () => {
  const week = getMomentumWeek(new Date('2026-03-10T12:00:00.000Z'), 'America/New_York');
  const previous = getPreviousMomentumWeek(new Date('2026-03-10T12:00:00.000Z'), 'America/New_York');
  assert.equal(week.startInclusive, '2026-03-09T04:00:00.000Z');
  assert.equal(previous.startInclusive, '2026-03-02T05:00:00.000Z');
});

test('invalid timezones deterministically fall back to UTC', () => {
  const week = getMomentumWeek(new Date('2026-08-05T16:00:00.000Z'), 'Not/AZone');
  assert.equal(week.timezone, 'UTC');
  assert.equal(week.startInclusive, '2026-08-03T00:00:00.000Z');
});
