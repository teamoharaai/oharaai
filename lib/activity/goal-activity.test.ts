import assert from 'node:assert/strict';
import test from 'node:test';
import type { GoalActivityEvent } from './goal-activity.ts';
import { buildActivityWindow } from './goal-activity.ts';

function event(overrides: Partial<GoalActivityEvent> = {}): GoalActivityEvent {
  return { goalId: 'goal', kind: 'task_completed', localDate: '2026-09-16', ...overrides };
}

test('emits exactly `days` contiguous buckets, oldest→newest with today last', () => {
  const window = buildActivityWindow([], { asOfLocalDate: '2026-09-16', days: 7 });
  assert.equal(window.length, 7);
  assert.deepEqual(window.map((bucket) => bucket.date), [
    '2026-09-10', '2026-09-11', '2026-09-12', '2026-09-13', '2026-09-14', '2026-09-15', '2026-09-16',
  ]);
  // 2026-09-16 is a Wednesday → isoWeekday 3; the row runs Thu(4)…Wed(3).
  assert.deepEqual(window.map((bucket) => bucket.isoWeekday), [4, 5, 6, 7, 1, 2, 3]);
  assert.deepEqual(window.map((bucket) => bucket.isToday), [false, false, false, false, false, false, true]);
});

test('a task_completed event fills only its own day', () => {
  const window = buildActivityWindow([event({ localDate: '2026-09-13' })], { asOfLocalDate: '2026-09-16', days: 7 });
  const filled = window.filter((bucket) => bucket.count > 0);
  assert.equal(filled.length, 1);
  assert.equal(filled[0].date, '2026-09-13');
  assert.deepEqual(filled[0].kinds, ['task_completed']);
  assert.equal(filled[0].count, 1);
});

test('two events same day, different kinds → distinct kinds in declaration order, count 2', () => {
  const window = buildActivityWindow([
    event({ localDate: '2026-09-15', kind: 'milestone_completed' }),
    event({ localDate: '2026-09-15', kind: 'task_completed' }),
  ], { asOfLocalDate: '2026-09-16', days: 7 });
  const day = window.find((bucket) => bucket.date === '2026-09-15');
  assert.ok(day);
  assert.deepEqual(day.kinds, ['task_completed', 'milestone_completed']);
  assert.equal(day.count, 2);
});

test('two events same day, same kind → one kind, count 2', () => {
  const window = buildActivityWindow([
    event({ localDate: '2026-09-16' }),
    event({ localDate: '2026-09-16' }),
  ], { asOfLocalDate: '2026-09-16', days: 7 });
  const today = window[window.length - 1];
  assert.deepEqual(today.kinds, ['task_completed']);
  assert.equal(today.count, 2);
});

test('empty input → all buckets kinds:[] count:0', () => {
  const window = buildActivityWindow([], { asOfLocalDate: '2026-09-16', days: 7 });
  assert.ok(window.every((bucket) => bucket.kinds.length === 0 && bucket.count === 0));
});

test('events outside the window are excluded (older than start and after today)', () => {
  const window = buildActivityWindow([
    event({ localDate: '2026-09-09' }), // one day before the 7-day start
    event({ localDate: '2026-09-17' }), // after asOf
    event({ localDate: '2026-09-10' }), // exactly the window start → included
  ], { asOfLocalDate: '2026-09-16', days: 7 });
  const totals = window.reduce((sum, bucket) => sum + bucket.count, 0);
  assert.equal(totals, 1);
  assert.equal(window[0].count, 1);
  assert.equal(window[0].date, '2026-09-10');
});

test('isToday is set only on the last bucket', () => {
  const window = buildActivityWindow([], { asOfLocalDate: '2026-09-16', days: 7 });
  assert.equal(window.filter((bucket) => bucket.isToday).length, 1);
  assert.equal(window[window.length - 1].isToday, true);
});

test('a longer heatmap window keeps the same shape and ordering', () => {
  const window = buildActivityWindow([event({ localDate: '2026-08-20' })], { asOfLocalDate: '2026-09-16', days: 28 });
  assert.equal(window.length, 28);
  assert.equal(window[0].date, '2026-08-20');
  assert.equal(window[0].count, 1);
  assert.equal(window[window.length - 1].date, '2026-09-16');
  assert.equal(window[window.length - 1].isToday, true);
});

test('days < 1 yields an empty window', () => {
  assert.deepEqual(buildActivityWindow([event()], { asOfLocalDate: '2026-09-16', days: 0 }), []);
});
