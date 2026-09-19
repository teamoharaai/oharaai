import assert from 'node:assert/strict';
import test from 'node:test';
import type { Task, TaskOccurrence } from './types.ts';
import {
  computeTaskBoundaryDelayMs,
  earliestTaskBoundaryEpoch,
  nextLocalMidnightEpoch,
} from './task-boundary.ts';

// Minimal fixtures — only the fields the boundary helpers read matter.
function occ(overrides: Partial<TaskOccurrence>): TaskOccurrence {
  return {
    id: 'o', taskId: 't', scheduleId: null, occurrenceKey: 'k',
    scheduledLocalDate: '2026-09-14', scheduledLocalTime: null, scheduleTimezone: 'UTC',
    scheduledAt: null, status: 'pending', actualQuantity: null, note: null,
    completedAt: null, skippedAt: null, source: 'schedule',
    createdAt: '', updatedAt: '', ...overrides,
  };
}
function task(occurrences: TaskOccurrence[], timezone = 'UTC'): Task {
  return {
    id: 't', goalId: 'g', milestoneId: null, title: 'T', description: null,
    completionMode: 'binary', targetQuantity: null, quantityUnit: null, status: 'active',
    dueDate: null, source: 'user', legacyCurrentValue: null, legacyFrequency: null,
    sortOrder: 0, createdAt: '', updatedAt: '', completedAt: null, archivedAt: null,
    schedules: [{
      id: 's', taskId: 't', version: 1, recurrenceKind: 'daily', intervalCount: 1,
      weekdays: [], targetCount: null, startDate: '2026-01-01', endDate: null, localTime: null,
      timezone, isActive: true, source: 'user',
    }],
    occurrences,
  } as Task;
}

test('nextLocalMidnightEpoch is the UTC instant of the next local midnight after now', () => {
  // 2026-09-14T12:00Z in UTC → next local midnight is 2026-09-15T00:00Z.
  const now = new Date('2026-09-14T12:00:00.000Z');
  assert.equal(nextLocalMidnightEpoch('UTC', now), new Date('2026-09-15T00:00:00.000Z').getTime());
});

test('nextLocalMidnightEpoch respects the timezone (New York is UTC-4 in September)', () => {
  // 2026-09-14T12:00Z = 08:00 local NY on the 14th → next local midnight is
  // 2026-09-15T00:00 NY = 2026-09-15T04:00Z.
  const now = new Date('2026-09-14T12:00:00.000Z');
  assert.equal(
    nextLocalMidnightEpoch('America/New_York', now),
    new Date('2026-09-15T04:00:00.000Z').getTime(),
  );
});

test('earliest boundary is the minimum next-midnight across dated actionable occurrences', () => {
  const now = new Date('2026-09-14T12:00:00.000Z');
  // A UTC task (next midnight 15T00:00Z) and a Tokyo task (UTC+9: local day already
  // 14th 21:00 → next midnight 15T00:00 JST = 14T15:00Z, earlier in absolute time).
  const utcTask = task([occ({ scheduleTimezone: 'UTC' })], 'UTC');
  const tokyoTask = task([occ({ scheduleTimezone: 'Asia/Tokyo' })], 'Asia/Tokyo');
  const earliest = earliestTaskBoundaryEpoch([utcTask, tokyoTask], now);
  assert.equal(earliest, new Date('2026-09-14T15:00:00.000Z').getTime());
});

test('only dated, actionable (pending/missed) occurrences count toward the boundary', () => {
  const now = new Date('2026-09-14T12:00:00.000Z');
  // Completed + anytime (no date) occurrences do not shift at midnight → no boundary.
  const completed = task([occ({ status: 'completed', completedAt: now.toISOString() })]);
  const anytime = task([occ({ scheduledLocalDate: null })]);
  assert.equal(earliestTaskBoundaryEpoch([completed, anytime], now), null);
  assert.equal(earliestTaskBoundaryEpoch([], now), null);
});

test('missed occurrences still count (they roll on the next day too)', () => {
  const now = new Date('2026-09-14T12:00:00.000Z');
  const missed = task([occ({ status: 'missed' })], 'UTC');
  assert.equal(
    earliestTaskBoundaryEpoch([missed], now),
    new Date('2026-09-15T00:00:00.000Z').getTime(),
  );
});

test('delay fires just after the boundary; already-past boundary clamps to the minimum', () => {
  const now = new Date('2026-09-14T23:59:50.000Z'); // 10s before UTC midnight
  const delay = computeTaskBoundaryDelayMs([task([occ({})], 'UTC')], now, { padMs: 1000, minDelayMs: 1000 });
  assert.equal(delay, 10_000 + 1000);

  // No dated occurrence → no timer.
  assert.equal(computeTaskBoundaryDelayMs([task([occ({ scheduledLocalDate: null })])], now), null);
});
