import assert from 'node:assert/strict';
import test from 'node:test';
import { deriveProjectVisualCategory, mergeProjectActivity } from './model.ts';

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
