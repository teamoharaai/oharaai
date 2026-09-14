import assert from 'node:assert/strict';
import test from 'node:test';
import type { Task, TaskOccurrence } from './types.ts';
import { buildTaskSections, scheduleLabel } from './utils.ts';
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

test('schedule and quantity validation reject ambiguous native configuration', () => {
  assert.throws(() => scheduleInput({ recurrenceKind: 'weekly', weekdays: [] }), /require at least one weekday/);
  assert.throws(() => validateQuantityConfiguration('quantity', 0, 'pages'), /positive target/);
  assert.throws(() => validateQuantityConfiguration('binary', 1, null), /cannot have quantity/);
  assert.deepEqual(scheduleInput({
    recurrenceKind: 'weekly', intervalCount: 2, weekdays: [5, 1, 5],
    startDate: '2026-09-11', endDate: '2026-12-31', localTime: '17:30',
  })?.weekdays, [1, 5]);
});
