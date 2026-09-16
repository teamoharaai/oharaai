import assert from 'node:assert/strict';
import test from 'node:test';
import type { Task, TaskOccurrence } from './types.ts';
import {
  beginMutation,
  createMutationRegistry,
  endMutation,
  findOccurrenceTaskId,
  isLatestMutation,
  optimisticQuantityDelta,
  optimisticSetCompleted,
  optimisticSkip,
  patchOccurrence,
  patchTaskInList,
  replaceOccurrenceInTasks,
  resetRegistry,
} from './task-optimism.ts';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function occurrence(overrides: Partial<TaskOccurrence> = {}): TaskOccurrence {
  return {
    id: 'occ-1',
    taskId: 'task-1',
    scheduleId: 'sched-1',
    occurrenceKey: '2026-09-14',
    scheduledLocalDate: '2026-09-14',
    scheduledLocalTime: null,
    scheduleTimezone: 'UTC',
    scheduledAt: null,
    status: 'pending',
    actualQuantity: null,
    note: null,
    completedAt: null,
    skippedAt: null,
    source: 'schedule',
    createdAt: '2026-09-14T00:00:00.000Z',
    updatedAt: '2026-09-14T00:00:00.000Z',
    ...overrides,
  };
}

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    goalId: 'goal-1',
    milestoneId: null,
    title: 'Do the thing',
    description: null,
    completionMode: 'binary',
    targetQuantity: null,
    quantityUnit: null,
    status: 'active',
    dueDate: null,
    source: 'user',
    legacyCurrentValue: null,
    legacyFrequency: null,
    sortOrder: 0,
    createdAt: '2026-09-14T00:00:00.000Z',
    updatedAt: '2026-09-14T00:00:00.000Z',
    completedAt: null,
    archivedAt: null,
    schedules: [],
    occurrences: [occurrence()],
    ...overrides,
  };
}

const NOW = '2026-09-14T12:00:00.000Z';

// ─── Optimistic transforms ────────────────────────────────────────────────────

test('optimistic complete marks the occurrence completed without mutating the input', () => {
  const before = task();
  const after = optimisticSetCompleted(before, 'occ-1', true, NOW);
  assert.equal(after.occurrences[0].status, 'completed');
  assert.equal(after.occurrences[0].completedAt, NOW);
  assert.equal(after.occurrences[0].skippedAt, null);
  // Immutability: the snapshot used for rollback is untouched.
  assert.equal(before.occurrences[0].status, 'pending');
  assert.equal(before.occurrences[0].completedAt, null);
  assert.notEqual(after, before);
  assert.notEqual(after.occurrences[0], before.occurrences[0]);
});

test('optimistic uncomplete (setCompleted false) clears completion back to pending', () => {
  const before = task({ occurrences: [occurrence({ status: 'completed', completedAt: NOW })] });
  const after = optimisticSetCompleted(before, 'occ-1', false, NOW);
  assert.equal(after.occurrences[0].status, 'pending');
  assert.equal(after.occurrences[0].completedAt, null);
});

test('optimistic skip sets skipped status + skippedAt and clears completedAt', () => {
  const after = optimisticSkip(task(), 'occ-1', NOW);
  assert.equal(after.occurrences[0].status, 'skipped');
  assert.equal(after.occurrences[0].skippedAt, NOW);
  assert.equal(after.occurrences[0].completedAt, null);
});

test('quantity delta bumps actualQuantity and completes only at/above a positive target', () => {
  const base = task({ completionMode: 'quantity', targetQuantity: 3, occurrences: [occurrence({ actualQuantity: 1 })] });

  const below = optimisticQuantityDelta(base, 'occ-1', 1, 3, NOW);
  assert.equal(below.occurrences[0].actualQuantity, 2);
  assert.equal(below.occurrences[0].status, 'pending');
  assert.equal(below.occurrences[0].completedAt, null);

  const reaches = optimisticQuantityDelta(below, 'occ-1', 1, 3, NOW);
  assert.equal(reaches.occurrences[0].actualQuantity, 3);
  assert.equal(reaches.occurrences[0].status, 'completed');
  assert.equal(reaches.occurrences[0].completedAt, NOW);
});

test('quantity delta never drops below zero and never auto-completes without a positive target', () => {
  const base = task({ completionMode: 'quantity', occurrences: [occurrence({ actualQuantity: 0 })] });
  const clamped = optimisticQuantityDelta(base, 'occ-1', -5, null, NOW);
  assert.equal(clamped.occurrences[0].actualQuantity, 0);
  assert.equal(clamped.occurrences[0].status, 'pending');

  const noTarget = optimisticQuantityDelta(task({ occurrences: [occurrence({ actualQuantity: 9 })] }), 'occ-1', 5, null, NOW);
  assert.equal(noTarget.occurrences[0].actualQuantity, 14);
  assert.equal(noTarget.occurrences[0].status, 'pending');
});

test('a transform targeting a missing occurrence returns an equivalent task (no throw)', () => {
  const after = optimisticQuantityDelta(task(), 'nope', 1, 3, NOW);
  assert.equal(after.occurrences[0].status, 'pending');
});

// ─── List / occurrence patchers ───────────────────────────────────────────────

test('patchTaskInList updates one task by id without clobbering unrelated tasks', () => {
  const tasks = [task({ id: 'a' }), task({ id: 'b', title: 'B' })];
  const next = patchTaskInList(tasks, 'b', (t) => ({ ...t, title: 'B2' }));
  assert.equal(next[0].title, 'Do the thing'); // untouched
  assert.equal(next[1].title, 'B2');
  assert.equal(next[0], tasks[0]); // unrelated task keeps its reference
  assert.notEqual(next[1], tasks[1]);
});

test('patchOccurrence merges one occurrence by id and leaves siblings alone', () => {
  const t = task({ occurrences: [occurrence({ id: 'o1' }), occurrence({ id: 'o2', status: 'completed' })] });
  const next = patchOccurrence(t, 'o1', { note: 'hi' });
  assert.equal(next.occurrences[0].note, 'hi');
  assert.equal(next.occurrences[1].status, 'completed');
  assert.equal(next.occurrences[1], t.occurrences[1]);
});

test('findOccurrenceTaskId locates the owning task or returns null', () => {
  const tasks = [task({ id: 'a', occurrences: [occurrence({ id: 'oa' })] }), task({ id: 'b', occurrences: [occurrence({ id: 'ob' })] })];
  assert.equal(findOccurrenceTaskId(tasks, 'ob'), 'b');
  assert.equal(findOccurrenceTaskId(tasks, 'missing'), null);
});

test('replaceOccurrenceInTasks reconciles the authoritative occurrence by id', () => {
  const tasks = [task({ occurrences: [occurrence({ id: 'occ-1', status: 'pending' })] })];
  const authoritative = occurrence({ id: 'occ-1', taskId: 'task-1', status: 'completed', completedAt: NOW });
  const next = replaceOccurrenceInTasks(tasks, authoritative);
  assert.equal(next[0].occurrences[0].status, 'completed');
  assert.equal(next[0].occurrences[0].completedAt, NOW);
});

// ─── Mutation registry (in-flight + ordering) ─────────────────────────────────

test('an identical action in flight is skipped (double-tap = one mutation)', () => {
  const r = createMutationRegistry();
  const first = beginMutation(r, 'occ-1', 'complete');
  assert.equal(first, 1);
  assert.equal(beginMutation(r, 'occ-1', 'complete'), null); // same action pending → skipped
});

test('a different action supersedes the pending one and wins ordering', () => {
  const r = createMutationRegistry();
  const complete = beginMutation(r, 'occ-1', 'complete');
  const uncomplete = beginMutation(r, 'occ-1', 'uncomplete');
  assert.equal(complete, 1);
  assert.equal(uncomplete, 2);
  // The earlier complete response is no longer the latest → must not apply.
  assert.equal(isLatestMutation(r, 'occ-1', complete!), false);
  assert.equal(isLatestMutation(r, 'occ-1', uncomplete!), true);
});

test('endMutation clears pending only when still latest; reset wipes everything', () => {
  const r = createMutationRegistry();
  const s1 = beginMutation(r, 'occ-1', 'complete')!;
  const s2 = beginMutation(r, 'occ-1', 'uncomplete')!;
  endMutation(r, 'occ-1', s1); // stale → pending (for s2) remains
  assert.equal(r.pending.get('occ-1'), 'uncomplete');
  endMutation(r, 'occ-1', s2); // latest → cleared
  assert.equal(r.pending.has('occ-1'), false);
  resetRegistry(r);
  assert.equal(r.seq.size, 0);
});
