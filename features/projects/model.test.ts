import assert from 'node:assert/strict';
import test from 'node:test';
import { deriveProjectVisualCategory, mergeProjectActivity, selectProjectTaskPreviews } from './model.ts';

const goal = (category: string, status = 'active') => ({ category, status }) as never;

test('derives a dominant visual category from active Goals only', () => {
  assert.equal(deriveProjectVisualCategory([
    goal('Health & Fitness'), goal('Health & Fitness'), goal('Work & Money'), goal('Life & Relationships', 'complete'),
  ]), 'Health & Fitness');
});

test('uses neutral treatment for ties and empty Projects', () => {
  assert.equal(deriveProjectVisualCategory([goal('Health & Fitness'), goal('Work & Money')]), 'mixed');
  assert.equal(deriveProjectVisualCategory([]), 'mixed');
});

test('deduplicates and bounds truthful Project activity newest first', () => {
  const items = mergeProjectActivity([[{ id: 'a', label: 'A', occurredAt: '2026-01-01' }], [
    { id: 'a', label: 'A duplicate', occurredAt: '2026-01-01' },
    { id: 'b', label: 'B', occurredAt: '2026-02-01' },
  ]], 2);
  assert.deepEqual(items.map((item) => item.id), ['b', 'a']);
});

test('Project Tasks are a bounded canonical Goal Task projection', () => {
  const task = (id: string, scheduledLocalDate: string | null) => ({ id, goalId: 'goal', title: id, status: 'active', dueDate: null, completionMode: 'binary', targetQuantity: null, quantityUnit: null, occurrences: scheduledLocalDate ? [{ id: `${id}-occurrence`, status: 'pending', scheduledLocalDate }] : [] }) as never;
  const previews = selectProjectTaskPreviews([{ goalId: 'goal', goalTitle: 'Run a 5K', tasks: [task('future', '2026-09-25'), task('today', '2026-09-23'), task('anytime', null), task('overdue', '2026-09-22')] }], new Date('2026-09-23T12:00:00Z'), 3);
  assert.deepEqual(previews.map((item) => item.id), ['overdue', 'today', 'future']);
  assert.equal(previews.every((item) => item.goalTitle === 'Run a 5K'), true);
});

test('Project Tasks preserve canonical completion semantics and completed one-time state', () => {
  const completed = {
    id: 'binary', goalId: 'goal', title: 'Ship it', status: 'complete', dueDate: null,
    completionMode: 'binary', targetQuantity: null, quantityUnit: null,
    occurrences: [{ id: 'binary-occurrence', status: 'completed', scheduledLocalDate: null, completedAt: '2026-09-23T12:00:00Z', updatedAt: '2026-09-23T12:00:00Z' }],
  } as never;
  const quantityOccurrence = { id: 'quantity-occurrence', status: 'pending', scheduledLocalDate: null, actualQuantity: 1 };
  const quantity = {
    id: 'quantity', goalId: 'goal', title: 'Run laps', status: 'active', dueDate: null,
    completionMode: 'quantity', targetQuantity: 3, quantityUnit: 'laps',
    occurrences: [quantityOccurrence],
  } as never;
  const previews = selectProjectTaskPreviews([{ goalId: 'goal', goalTitle: 'Launch', tasks: [completed, quantity] }]);
  assert.equal(previews.find((item) => item.id === 'binary')?.occurrence?.status, 'completed');
  assert.deepEqual(previews.find((item) => item.id === 'quantity'), {
    id: 'quantity', goalId: 'goal', goalTitle: 'Launch', occurrence: quantityOccurrence,
    title: 'Run laps', timing: 'anytime', assignedTo: null,
    completionMode: 'quantity', targetQuantity: 3, quantityUnit: 'laps',
  });
});
