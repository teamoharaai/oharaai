import assert from 'node:assert/strict';
import test from 'node:test';
import type { Task, TaskOccurrence } from './types.ts';
import { bucketPlanItems, buildPlanItems, buildTaskSections, computeQuickPlanDates, computeScopeWindows, computeTodoDueWindows, isToDoTask, localDateTimeInputValue, parseRetroactiveCompletionTime, type PlanItem, QUICK_PLAN_CHIPS, scheduleLabel, shortDate, TODO_DUE_FILTERS, todoMatchesDueFilter } from './utils.ts';
import { scheduleInput, validateQuantityConfiguration } from './validation.ts';

function occurrence(overrides: Partial<TaskOccurrence> = {}): TaskOccurrence {
  return {
    id: 'occurrence', taskId: 'task', scheduleId: null, occurrenceKey: 'one-time:task',
    scheduledLocalDate: null, scheduledLocalTime: null, scheduleTimezone: 'America/New_York',
    scheduledAt: null, status: 'pending', actualQuantity: null, note: null,
    completedAt: null, skippedAt: null, source: 'user', createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z', ...overrides,
  };
}

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task', goalId: 'goal', milestoneId: null, title: 'Task', description: null,
    completionMode: 'binary', targetQuantity: null, quantityUnit: null, status: 'active',
    dueDate: null, source: 'user', legacyCurrentValue: null, legacyFrequency: null,
    sortOrder: 0, createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-01T00:00:00Z',
    completedAt: null, archivedAt: null, schedules: [], occurrences: [occurrence()], ...overrides,
  };
}

test('Today, Upcoming, Anytime, and completed are projections of occurrences', () => {
  const now = new Date('2026-09-11T16:00:00.000Z');
  const rows = [
    task({ id: 'today', occurrences: [occurrence({ id: 'today-o', taskId: 'today', scheduledLocalDate: '2026-09-11' })] }),
    task({ id: 'overdue', dueDate: '2026-09-10', occurrences: [occurrence({ id: 'overdue-o', taskId: 'overdue', scheduledLocalDate: '2026-09-10' })] }),
    task({ id: 'upcoming', occurrences: [occurrence({ id: 'upcoming-o', taskId: 'upcoming', scheduledLocalDate: '2026-09-12' })] }),
    task({ id: 'anytime', occurrences: [occurrence({ id: 'anytime-o', taskId: 'anytime' })] }),
    task({ id: 'done', occurrences: [occurrence({ id: 'done-o', taskId: 'done', status: 'completed', completedAt: '2026-09-11T14:00:00Z' })] }),
  ];
  const sections = buildTaskSections(rows, now);
  assert.deepEqual(sections.today.map(({ task: item }) => item.id), ['overdue', 'today']);
  assert.deepEqual(sections.upcoming.map(({ task: item }) => item.id), ['upcoming']);
  assert.deepEqual(sections.anytime.map(({ task: item }) => item.id), ['anytime']);
  assert.deepEqual(sections.completed.map(({ task: item }) => item.id), ['done']);
});

test('recurrence labels keep database concepts secondary', () => {
  const recurring = task({ schedules: [{
    id: 'schedule', taskId: 'task', version: 1, recurrenceKind: 'weekly', intervalCount: 2,
    weekdays: [1, 3, 5], targetCount: null, startDate: '2026-09-07', endDate: null, localTime: '09:00:00',
    timezone: 'America/New_York', isActive: true, source: 'user',
  }] });
  assert.equal(scheduleLabel(recurring), 'Every 2 weeks · Mon · Wed · Fri');
});

test('Upcoming collapses a daily task with a full horizon to one row', () => {
  const now = new Date('2026-09-11T16:00:00.000Z'); // noon America/New_York → today 2026-09-11
  const occurrences = Array.from({ length: 28 }, (_, index) => {
    const day = String(12 + index).padStart(2, '0');
    const date = index < 19 ? `2026-09-${day}` : `2026-10-${String(index - 18).padStart(2, '0')}`;
    return occurrence({ id: `daily-${index}`, taskId: 'daily', scheduleId: 'schedule', scheduledLocalDate: date });
  });
  const sections = buildTaskSections([task({ id: 'daily', occurrences })], now);
  assert.equal(sections.upcoming.length, 1);
  assert.equal(sections.upcoming[0].occurrence.scheduledLocalDate, '2026-09-12');
});

test('Upcoming keeps one row per task, ordered by earliest next date', () => {
  const now = new Date('2026-09-11T16:00:00.000Z');
  const later = task({ id: 'later', occurrences: [
    occurrence({ id: 'later-a', taskId: 'later', scheduleId: 'schedule', scheduledLocalDate: '2026-09-15' }),
    occurrence({ id: 'later-b', taskId: 'later', scheduleId: 'schedule', scheduledLocalDate: '2026-09-16' }),
  ] });
  const sooner = task({ id: 'sooner', occurrences: [
    occurrence({ id: 'sooner-a', taskId: 'sooner', scheduleId: 'schedule', scheduledLocalDate: '2026-09-13' }),
    occurrence({ id: 'sooner-b', taskId: 'sooner', scheduleId: 'schedule', scheduledLocalDate: '2026-09-14' }),
  ] });
  const sections = buildTaskSections([later, sooner], now);
  assert.deepEqual(sections.upcoming.map(({ task: item }) => item.id), ['sooner', 'later']);
  assert.deepEqual(sections.upcoming.map(({ occurrence: item }) => item.scheduledLocalDate), ['2026-09-13', '2026-09-15']);
});

test('A task with a Today occurrence still collapses its future rows to one Upcoming row', () => {
  const now = new Date('2026-09-11T16:00:00.000Z');
  const mixed = task({ id: 'mixed', occurrences: [
    occurrence({ id: 'mixed-today', taskId: 'mixed', scheduleId: 'schedule', scheduledLocalDate: '2026-09-11' }),
    occurrence({ id: 'mixed-next', taskId: 'mixed', scheduleId: 'schedule', scheduledLocalDate: '2026-09-12' }),
    occurrence({ id: 'mixed-later', taskId: 'mixed', scheduleId: 'schedule', scheduledLocalDate: '2026-09-13' }),
  ] });
  const sections = buildTaskSections([mixed], now);
  assert.deepEqual(sections.today.map(({ occurrence: item }) => item.id), ['mixed-today']);
  assert.equal(sections.upcoming.length, 1);
  assert.equal(sections.upcoming[0].occurrence.scheduledLocalDate, '2026-09-12');
});

test('A weekly task collapses to its earliest future weekday occurrence', () => {
  const now = new Date('2026-09-11T16:00:00.000Z'); // Fri 2026-09-11
  const weekly = task({ id: 'weekly', occurrences: [
    occurrence({ id: 'w-mon', taskId: 'weekly', scheduleId: 'schedule', scheduledLocalDate: '2026-09-14' }), // Mon
    occurrence({ id: 'w-wed', taskId: 'weekly', scheduleId: 'schedule', scheduledLocalDate: '2026-09-16' }), // Wed
    occurrence({ id: 'w-fri', taskId: 'weekly', scheduleId: 'schedule', scheduledLocalDate: '2026-09-18' }), // Fri
  ] });
  const sections = buildTaskSections([weekly], now);
  assert.equal(sections.upcoming.length, 1);
  assert.equal(sections.upcoming[0].occurrence.scheduledLocalDate, '2026-09-14');
});

function schedule(overrides: Partial<Task['schedules'][number]> = {}): Task['schedules'][number] {
  return {
    id: 's', taskId: 'task', version: 1, recurrenceKind: 'weekly', intervalCount: 1,
    weekdays: [1], targetCount: null, startDate: '2026-09-01', endDate: null, localTime: null,
    timezone: 'America/New_York', isActive: true, source: 'user', ...overrides,
  };
}

test('A daily-cadence task never enters Upcoming (TD-021 spam fix)', () => {
  const now = new Date('2026-09-11T16:00:00.000Z'); // noon America/New_York → today 2026-09-11
  const daily = task({ id: 'daily', schedules: [schedule({ taskId: 'daily', recurrenceKind: 'daily', weekdays: [] })], occurrences: [
    occurrence({ id: 'd-today', taskId: 'daily', scheduleId: 's', scheduledLocalDate: '2026-09-11' }),
    occurrence({ id: 'd-next', taskId: 'daily', scheduleId: 's', scheduledLocalDate: '2026-09-12' }),
    occurrence({ id: 'd-later', taskId: 'daily', scheduleId: 's', scheduledLocalDate: '2026-09-13' }),
  ] });
  const sections = buildTaskSections([daily], now);
  assert.equal(sections.upcoming.length, 0);
  assert.deepEqual(sections.today.map(({ occurrence: item }) => item.id), ['d-today']);
});

test('An on-set-days task keeps exactly one next-occurrence Upcoming row', () => {
  const now = new Date('2026-09-11T16:00:00.000Z'); // Fri 2026-09-11
  const setdays = task({ id: 'setdays', schedules: [schedule({ taskId: 'setdays', recurrenceKind: 'weekly', weekdays: [1, 3] })], occurrences: [
    occurrence({ id: 's-mon', taskId: 'setdays', scheduleId: 's', scheduledLocalDate: '2026-09-14' }), // Mon
    occurrence({ id: 's-wed', taskId: 'setdays', scheduleId: 's', scheduledLocalDate: '2026-09-16' }), // Wed
  ] });
  const sections = buildTaskSections([setdays], now);
  assert.equal(sections.upcoming.length, 1);
  assert.equal(sections.upcoming[0].occurrence.scheduledLocalDate, '2026-09-14');
});

test('A task with only completed occurrences has no Upcoming row', () => {
  const now = new Date('2026-09-11T16:00:00.000Z');
  const doneOnly = task({ id: 'done-only', occurrences: [
    occurrence({ id: 'done-1', taskId: 'done-only', scheduleId: 'schedule', status: 'completed', scheduledLocalDate: '2026-09-09', completedAt: '2026-09-09T14:00:00Z' }),
    occurrence({ id: 'done-2', taskId: 'done-only', scheduleId: 'schedule', status: 'completed', scheduledLocalDate: '2026-09-10', completedAt: '2026-09-10T14:00:00Z' }),
  ] });
  const sections = buildTaskSections([doneOnly], now);
  assert.equal(sections.upcoming.length, 0);
  assert.equal(sections.completed.length, 2);
});

test('shortDate renders a local calendar date without timezone drift', () => {
  assert.equal(shortDate('2026-09-12'), 'Sep 12');
  assert.equal(shortDate('2026-01-01'), 'Jan 1');
  assert.equal(shortDate(null), '');
});

test('retroactive completion defaults use local wall-clock fields', () => {
  const localInstant = new Date(2026, 8, 17, 9, 7, 42);
  assert.equal(localDateTimeInputValue(localInstant), '2026-09-17T09:07');
});

test('retroactive completion accepts current and historical local times but rejects future values', () => {
  const current = new Date(2026, 8, 17, 9, 7);
  const historical = new Date(2026, 8, 16, 8, 30);
  const currentParsed = parseRetroactiveCompletionTime(localDateTimeInputValue(current), current.getTime());
  const historicalParsed = parseRetroactiveCompletionTime(localDateTimeInputValue(historical), current.getTime());

  assert.equal(currentParsed?.getTime(), current.getTime());
  assert.equal(currentParsed?.toISOString(), current.toISOString());
  assert.equal(historicalParsed?.getTime(), historical.getTime());
  assert.equal(parseRetroactiveCompletionTime('2026-09-17T09:13', current.getTime()), null);
  assert.equal(parseRetroactiveCompletionTime('not-a-date', current.getTime()), null);
});

test('To-Do due windows are Monday-start weeks and calendar months', () => {
  // Wednesday 2026-09-16 (local). Week runs Mon 09-14 … Sun 09-20.
  const windows = computeTodoDueWindows(new Date(2026, 8, 16, 10, 0));
  assert.equal(windows.thisWeekStart, '2026-09-14');
  assert.equal(windows.thisWeekEnd, '2026-09-20');
  assert.equal(windows.nextWeekStart, '2026-09-21');
  assert.equal(windows.nextWeekEnd, '2026-09-27');
  assert.equal(windows.thisMonthStart, '2026-09-01');
  assert.equal(windows.thisMonthEnd, '2026-09-30');
});

test('To-Do due filter buckets by window; undated and far-future show only under All', () => {
  const windows = computeTodoDueWindows(new Date(2026, 8, 16, 10, 0));
  const thisWeek = '2026-09-18';
  const nextWeek = '2026-09-23';
  const laterThisMonth = '2026-09-28';
  const farFuture = '2026-12-01';

  // All shows everything, including undated.
  for (const date of [thisWeek, nextWeek, laterThisMonth, farFuture, null]) {
    assert.equal(todoMatchesDueFilter(date, 'all', windows), true);
  }

  assert.equal(todoMatchesDueFilter(thisWeek, 'thisWeek', windows), true);
  assert.equal(todoMatchesDueFilter(nextWeek, 'thisWeek', windows), false);

  assert.equal(todoMatchesDueFilter(nextWeek, 'nextWeek', windows), true);
  assert.equal(todoMatchesDueFilter(thisWeek, 'nextWeek', windows), false);

  assert.equal(todoMatchesDueFilter(laterThisMonth, 'thisMonth', windows), true);
  assert.equal(todoMatchesDueFilter(thisWeek, 'thisMonth', windows), true); // this week is within this month
  assert.equal(todoMatchesDueFilter(farFuture, 'thisMonth', windows), false);

  // Undated and far-future to-dos match no bucket except All.
  for (const filter of ['thisWeek', 'nextWeek', 'thisMonth'] as const) {
    assert.equal(todoMatchesDueFilter(null, filter, windows), false);
    assert.equal(todoMatchesDueFilter(farFuture, filter, windows), false);
  }

  assert.deepEqual(TODO_DUE_FILTERS.map((option) => option.value), ['all', 'thisWeek', 'nextWeek', 'thisMonth']);
});

test('quick-plan chip dates are local YYYY-MM-DD, Monday-start weeks', () => {
  // Wednesday 2026-09-16 (local). Week runs Mon 09-14 … Sun 09-20.
  const midweek = computeQuickPlanDates(new Date(2026, 8, 16, 10, 0));
  assert.equal(midweek.today, '2026-09-16');
  assert.equal(midweek.tomorrow, '2026-09-17');
  assert.equal(midweek.thisWeekend, '2026-09-19'); // Saturday of this week
  assert.equal(midweek.nextWeek, '2026-09-21'); // next Monday

  // Saturday 2026-09-19: "This Weekend" is today, not a week away.
  const saturday = computeQuickPlanDates(new Date(2026, 8, 19, 10, 0));
  assert.equal(saturday.thisWeekend, '2026-09-19');
  assert.equal(saturday.nextWeek, '2026-09-21');

  // Sunday 2026-09-20: this week's Saturday is already past, so "This Weekend"
  // falls back to today — never a date in the past.
  const sunday = computeQuickPlanDates(new Date(2026, 8, 20, 10, 0));
  assert.equal(sunday.today, '2026-09-20');
  assert.equal(sunday.thisWeekend, '2026-09-20');
  assert.equal(sunday.nextWeek, '2026-09-21'); // next Monday is tomorrow

  assert.deepEqual(QUICK_PLAN_CHIPS.map((chip) => chip.key), ['today', 'tomorrow', 'thisWeekend', 'nextWeek']);
});

test('scheduleLabel renders a weekly-count cadence as "N×/week"', () => {
  const weeklyCount = task({ schedules: [schedule({ recurrenceKind: 'weekly_count', weekdays: [], targetCount: 3 })] });
  assert.equal(scheduleLabel(weeklyCount), '3×/week');
});

test('scheduleInput accepts weekly_count with a 1..7 target and no weekdays', () => {
  const parsed = scheduleInput({ recurrenceKind: 'weekly_count', targetCount: 3 });
  assert.equal(parsed?.recurrenceKind, 'weekly_count');
  assert.equal(parsed?.targetCount, 3);
  assert.deepEqual(parsed?.weekdays, []);

  assert.throws(() => scheduleInput({ recurrenceKind: 'weekly_count' }), /1 to 7 times per week/);
  assert.throws(() => scheduleInput({ recurrenceKind: 'weekly_count', targetCount: 8 }), /1 to 7 times per week/);
  assert.throws(() => scheduleInput({ recurrenceKind: 'weekly_count', targetCount: 3, weekdays: [1] }), /no specific weekdays/);
  assert.throws(() => scheduleInput({ recurrenceKind: 'weekly', weekdays: [1], targetCount: 3 }), /only applies to a weekly-count/);
});

test('buildPlanItems treats a weekly_count Metric as a quantity counter (progress)', () => {
  const weekly = task({
    id: 'run', title: 'Run', completionMode: 'quantity', targetQuantity: 3,
    schedules: [schedule({ taskId: 'run', recurrenceKind: 'weekly_count', weekdays: [], targetCount: 3 })],
    occurrences: [occurrence({ id: 'wk', taskId: 'run', scheduleId: 's', status: 'pending', scheduledLocalDate: '2026-09-14', actualQuantity: 1 })],
  });
  const items = buildPlanItems([weekly]);
  assert.equal(items.length, 1);
  assert.equal(items[0].kind, 'metric');
  assert.deepEqual(items[0].progress, { done: 1, target: 3 });
});

test('isToDoTask discriminates a one-time user check-off from a Metric', () => {
  assert.equal(isToDoTask(task()), true); // binary, user, no schedule
  assert.equal(isToDoTask(task({ schedules: [schedule()] })), false); // has a schedule → Metric
  assert.equal(isToDoTask(task({ completionMode: 'quantity' })), false); // counter → Metric
  assert.equal(isToDoTask(task({ source: 'legacy_tracker' })), false); // imported → Metric
  assert.equal(isToDoTask(task({ status: 'archived' })), false);
});

test('buildPlanItems: To-Do → one item; Metric → earliest actionable + completed history', () => {
  const todo = task({ id: 'todo', title: 'Email advisor', dueDate: '2026-09-18', occurrences: [occurrence({ id: 'todo-o', taskId: 'todo', status: 'pending' })] });
  const metric = task({
    id: 'run', title: 'Run', completionMode: 'quantity', targetQuantity: 3,
    schedules: [schedule({ taskId: 'run', recurrenceKind: 'daily', weekdays: [] })],
    occurrences: [
      occurrence({ id: 'r-15', taskId: 'run', scheduleId: 's', status: 'completed', scheduledLocalDate: '2026-09-15', actualQuantity: 3, completedAt: '2026-09-15T14:00:00Z' }),
      occurrence({ id: 'r-16', taskId: 'run', scheduleId: 's', status: 'pending', scheduledLocalDate: '2026-09-16' }),
      occurrence({ id: 'r-17', taskId: 'run', scheduleId: 's', status: 'pending', scheduledLocalDate: '2026-09-17' }),
    ],
  });
  const items = buildPlanItems([todo, metric]);

  const todoItem = items.find((item) => item.taskId === 'todo');
  assert.equal(todoItem?.kind, 'todo');
  assert.equal(todoItem?.date, '2026-09-18');
  assert.equal(todoItem?.status, 'pending');
  assert.equal(todoItem?.progress, null);

  const metricActionable = items.filter((item) => item.taskId === 'run' && item.status !== 'completed');
  assert.equal(metricActionable.length, 1); // collapsed to earliest, not one row per occurrence
  assert.equal(metricActionable[0].date, '2026-09-16');
  assert.deepEqual(metricActionable[0].progress, { done: 0, target: 3 });

  const metricCompleted = items.filter((item) => item.taskId === 'run' && item.status === 'completed');
  assert.equal(metricCompleted.length, 1);
  assert.deepEqual(metricCompleted[0].progress, { done: 3, target: 3 });
});

test('buildPlanItems: set-days Metric aggregates the week under week scope (day strip + days counter)', () => {
  const now = new Date(2026, 8, 16, 10, 0); // Wednesday 2026-09-16 (Mon of week = 09-14)
  const runMonWed = task({
    id: 'run', title: 'Run', completionMode: 'binary',
    schedules: [schedule({ taskId: 'run', recurrenceKind: 'weekly', weekdays: [1, 3] })],
    occurrences: [
      occurrence({ id: 'mon', taskId: 'run', scheduleId: 's', status: 'completed', scheduledLocalDate: '2026-09-14', completedAt: '2026-09-14T14:00:00Z' }),
      occurrence({ id: 'wed', taskId: 'run', scheduleId: 's', status: 'pending', scheduledLocalDate: '2026-09-16' }),
    ],
  });
  const items = buildPlanItems([runMonWed], 'week', now);
  assert.equal(items.length, 1); // one aggregate row, not one row per occurrence
  const agg = items[0];
  assert.equal(agg.kind, 'metric');
  assert.equal(agg.date, '2026-09-16'); // pinned into the current week → in-scope
  assert.equal(agg.status, 'pending');
  assert.deepEqual(agg.progress, { done: 1, target: 2 }); // days counter, not a quantity
  assert.equal(agg.weekdayCells?.length, 7);
  const mon = agg.weekdayCells?.find((c) => c.weekday === 1);
  const tue = agg.weekdayCells?.find((c) => c.weekday === 2);
  const wed = agg.weekdayCells?.find((c) => c.weekday === 3);
  assert.deepEqual({ scheduled: mon?.scheduled, status: mon?.status, occurrenceId: mon?.occurrenceId, date: mon?.date }, { scheduled: true, status: 'completed', occurrenceId: 'mon', date: '2026-09-14' });
  assert.deepEqual({ scheduled: wed?.scheduled, status: wed?.status, occurrenceId: wed?.occurrenceId, date: wed?.date }, { scheduled: true, status: 'pending', occurrenceId: 'wed', date: '2026-09-16' });
  assert.deepEqual({ scheduled: tue?.scheduled, status: tue?.status }, { scheduled: false, status: null }); // unscheduled day
});

test('buildPlanItems: a fully-done set-days week rolls up as completed', () => {
  const now = new Date(2026, 8, 16, 10, 0);
  const done = task({
    id: 'run', completionMode: 'binary',
    schedules: [schedule({ taskId: 'run', recurrenceKind: 'weekly', weekdays: [1, 3] })],
    occurrences: [
      occurrence({ id: 'mon', taskId: 'run', scheduleId: 's', status: 'completed', scheduledLocalDate: '2026-09-14', completedAt: '2026-09-14T14:00:00Z' }),
      occurrence({ id: 'wed', taskId: 'run', scheduleId: 's', status: 'completed', scheduledLocalDate: '2026-09-16', completedAt: '2026-09-16T14:00:00Z' }),
    ],
  });
  const agg = buildPlanItems([done], 'week', now)[0];
  assert.equal(agg.status, 'completed');
  assert.deepEqual(agg.progress, { done: 2, target: 2 });
});

test('buildPlanItems: today scope keeps the set-days Metric per-day (no weekday strip)', () => {
  const now = new Date(2026, 8, 16, 10, 0);
  const runMonWed = task({
    id: 'run', completionMode: 'binary',
    schedules: [schedule({ taskId: 'run', recurrenceKind: 'weekly', weekdays: [1, 3] })],
    occurrences: [
      occurrence({ id: 'mon', taskId: 'run', scheduleId: 's', status: 'completed', scheduledLocalDate: '2026-09-14', completedAt: '2026-09-14T14:00:00Z' }),
      occurrence({ id: 'wed', taskId: 'run', scheduleId: 's', status: 'pending', scheduledLocalDate: '2026-09-16' }),
    ],
  });
  const items = buildPlanItems([runMonWed], 'today', now);
  assert.equal(items.every((item) => item.weekdayCells == null), true); // no aggregate under Today
  const actionable = items.filter((item) => item.status !== 'completed');
  assert.equal(actionable.length, 1);
  assert.equal(actionable[0].occurrenceId, 'wed'); // earliest actionable single day
});

test('buildPlanItems: a quantity set-days Metric aggregates too, carrying per-day quantity', () => {
  const now = new Date(2026, 8, 16, 10, 0);
  const measured = task({
    id: 'run', completionMode: 'quantity', targetQuantity: 5, quantityUnit: 'km',
    schedules: [schedule({ taskId: 'run', recurrenceKind: 'weekly', weekdays: [1, 3] })],
    occurrences: [
      // Mon met its 5km target → auto-completed; Wed logged 2km, still pending.
      occurrence({ id: 'mon', taskId: 'run', scheduleId: 's', status: 'completed', scheduledLocalDate: '2026-09-14', actualQuantity: 5, completedAt: '2026-09-14T14:00:00Z' }),
      occurrence({ id: 'wed', taskId: 'run', scheduleId: 's', status: 'pending', scheduledLocalDate: '2026-09-16', actualQuantity: 2 }),
    ],
  });
  const agg = buildPlanItems([measured], 'week', now)[0];
  assert.ok(agg.weekdayCells, 'quantity set-days now aggregates into the strip');
  assert.deepEqual(agg.progress, { done: 1, target: 2 }); // days-counter (Mon done), NOT the km counter
  const mon = agg.weekdayCells?.find((c) => c.weekday === 1);
  const wed = agg.weekdayCells?.find((c) => c.weekday === 3);
  assert.deepEqual({ status: mon?.status, quantity: mon?.quantity }, { status: 'completed', quantity: 5 });
  assert.deepEqual({ status: wed?.status, quantity: wed?.quantity }, { status: 'pending', quantity: 2 }); // per-day km preserved
});

test('computeScopeWindows derives relative in-scope + next-period bounds', () => {
  const now = new Date(2026, 8, 16, 10, 0); // Wednesday 2026-09-16

  const today = computeScopeWindows('today', now);
  assert.deepEqual(today, { today: '2026-09-16', inScopeEnd: '2026-09-16', upcomingStart: '2026-09-17', upcomingEnd: '2026-09-17' });

  const week = computeScopeWindows('week', now);
  assert.deepEqual(week, { today: '2026-09-16', inScopeEnd: '2026-09-20', upcomingStart: '2026-09-21', upcomingEnd: '2026-09-27' });

  const month = computeScopeWindows('month', now);
  assert.deepEqual(month, { today: '2026-09-16', inScopeEnd: '2026-09-30', upcomingStart: '2026-10-01', upcomingEnd: '2026-10-31' });
});

test('bucketPlanItems is total and scope-relative (nothing stranded)', () => {
  const now = new Date(2026, 8, 16, 10, 0); // Wednesday 2026-09-16
  const item = (over: Partial<PlanItem> & Pick<PlanItem, 'taskId'>): PlanItem => ({
    occurrenceId: over.taskId, title: over.taskId, kind: 'todo', date: null, time: null, status: 'pending', progress: null, ...over,
  });
  const items: PlanItem[] = [
    item({ taskId: 'past', date: '2026-09-10' }),
    item({ taskId: 'today', date: '2026-09-16' }),
    item({ taskId: 'tomorrow', date: '2026-09-17' }),
    item({ taskId: 'nextweek', date: '2026-09-25' }),
    item({ taskId: 'undated', date: null }),
    item({ taskId: 'done', date: '2026-09-16', status: 'completed' }),
  ];

  const byToday = bucketPlanItems(items, 'today', now);
  assert.deepEqual(byToday.overdue.map((i) => i.taskId), ['past']);
  assert.deepEqual(byToday.inScope.map((i) => i.taskId), ['today']);
  assert.deepEqual(byToday.upcoming.map((i) => i.taskId), ['tomorrow']);
  assert.deepEqual(byToday.later.map((i) => i.taskId), ['nextweek']);
  assert.deepEqual(byToday.someday.map((i) => i.taskId), ['undated']);
  assert.deepEqual(byToday.completed.map((i) => i.taskId), ['done']);
  const total = byToday.overdue.length + byToday.inScope.length + byToday.upcoming.length + byToday.later.length + byToday.someday.length + byToday.completed.length;
  assert.equal(total, items.length); // every item placed exactly once

  const byWeek = bucketPlanItems(items, 'week', now);
  assert.deepEqual(byWeek.inScope.map((i) => i.taskId), ['today', 'tomorrow']); // both fall within this week
  assert.deepEqual(byWeek.upcoming.map((i) => i.taskId), ['nextweek']);
  assert.deepEqual(byWeek.later.map((i) => i.taskId), []);
  assert.deepEqual(byWeek.overdue.map((i) => i.taskId), ['past']);
});

test('schedule and quantity validation reject ambiguous native configuration', () => {
  assert.throws(() => scheduleInput({ recurrenceKind: 'weekly', weekdays: [] }), /require at least one weekday/);
  // A provided target must be positive, but the target + unit are optional (a bare
  // counter just counts up) — migration 056, Goal Detail Redesign Phase 2.
  assert.throws(() => validateQuantityConfiguration('quantity', 0, 'pages'), /positive number/);
  assert.doesNotThrow(() => validateQuantityConfiguration('quantity', null, null));
  assert.doesNotThrow(() => validateQuantityConfiguration('quantity', 30, 'pages'));
  assert.throws(() => validateQuantityConfiguration('binary', 1, null), /cannot have quantity/);
  assert.deepEqual(scheduleInput({
    recurrenceKind: 'weekly', intervalCount: 2, weekdays: [5, 1, 5],
    startDate: '2026-09-11', endDate: '2026-12-31', localTime: '17:30',
  })?.weekdays, [1, 5]);
});
