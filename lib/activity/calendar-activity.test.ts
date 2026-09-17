import assert from 'node:assert/strict';
import test from 'node:test';
import { buildActivityWindow } from './goal-activity.ts';
import { buildCurrentMonth, buildCurrentWeek } from './calendar-activity.ts';

test('current week is exactly Monday→Sunday, today anchored, later days are future', () => {
  // asOf 2026-09-16 is a Wednesday. Its week is Mon 09-14 … Sun 09-20.
  const buckets = buildActivityWindow(
    [
      { goalId: 'g', kind: 'task_completed', localDate: '2026-09-14' }, // Mon
      { goalId: 'g', kind: 'entry_created', localDate: '2026-09-16' }, // Wed (today)
      { goalId: 'g', kind: 'milestone_completed', localDate: '2026-09-16' },
    ],
    { asOfLocalDate: '2026-09-16', days: 70 },
  );
  const { slots, maxCount } = buildCurrentWeek(buckets, '2026-09-16');

  assert.equal(slots.length, 7);
  assert.equal(slots[0].date, '2026-09-14'); // Monday first
  assert.equal(slots[0].isoWeekday, 1);
  assert.equal(slots[6].date, '2026-09-20'); // Sunday last
  assert.equal(slots[6].isoWeekday, 7);

  assert.equal(slots[0].count, 1); // Monday
  assert.equal(slots[2].isToday, true); // Wednesday = today
  assert.equal(slots[2].count, 2); // two events today
  assert.equal(maxCount, 2);

  // Thu..Sun are later this week → future, no data.
  assert.deepEqual(slots.slice(3).map((s) => s.isFuture), [true, true, true, true]);
  assert.deepEqual(slots.slice(3).map((s) => s.count), [0, 0, 0, 0]);
});

test('current month grid is Monday-aligned with correct leading pad and day numbers', () => {
  // September 2026: the 1st is a Tuesday → one leading null (Monday) before day 1.
  const buckets = buildActivityWindow([], { asOfLocalDate: '2026-09-16', days: 70 });
  const { year, month, weeks } = buildCurrentMonth(buckets, '2026-09-16');

  assert.equal(year, 2026);
  assert.equal(month, 9);
  assert.ok(weeks.every((week) => week.length === 7));

  // First row: Monday cell is padding (null), Tuesday cell is the 1st.
  assert.equal(weeks[0][0], null);
  assert.equal(weeks[0][1]?.dayOfMonth, 1);
  assert.equal(weeks[0][1]?.date, '2026-09-01');

  // Every in-month day appears exactly once, 1..30, in order.
  const days = weeks.flat().filter((s): s is NonNullable<typeof s> => s !== null).map((s) => s.dayOfMonth);
  assert.deepEqual(days, Array.from({ length: 30 }, (_, i) => i + 1));

  // Today (the 16th) is anchored; days after it this month are future.
  const today = weeks.flat().find((s) => s?.isToday);
  assert.equal(today?.dayOfMonth, 16);
  const seventeenth = weeks.flat().find((s) => s?.dayOfMonth === 17);
  assert.equal(seventeenth?.isFuture, true);
});

test('month grid counts land on the right calendar day', () => {
  const buckets = buildActivityWindow(
    [{ goalId: 'g', kind: 'task_completed', localDate: '2026-09-10' }],
    { asOfLocalDate: '2026-09-16', days: 70 },
  );
  const { weeks, maxCount } = buildCurrentMonth(buckets, '2026-09-16');
  const tenth = weeks.flat().find((s) => s?.dayOfMonth === 10);
  assert.equal(tenth?.count, 1);
  assert.equal(maxCount, 1);
});
