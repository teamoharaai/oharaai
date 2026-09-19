import assert from 'node:assert/strict';
import test from 'node:test';
import type { Task, TaskOccurrence } from './types.ts';
import { buildTaskSections, localDateTimeInputValue, parseRetroactiveCompletionTime, scheduleLabel, shortDate } from './utils.ts';
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
    weekdays: [1, 3, 5], startDate: '2026-09-07', endDate: null, localTime: '09:00:00',
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
    weekdays: [1], startDate: '2026-09-01', endDate: null, localTime: null,
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
