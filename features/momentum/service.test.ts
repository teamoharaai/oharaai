import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateWeeklyStreak, calculationHash } from './services/momentum-service.ts';
import type { RawActionCompletion } from './normalization.ts';

function completion(id: string, completedAt: string): RawActionCompletion {
  return {
    completedAt,
    createdAt: completedAt,
    dueDate: completedAt.slice(0, 10),
    goalId: id,
    goalStatus: 'active',
    id,
    status: 'complete',
    userId: 'user',
  };
}

test('weekly streak counts consecutive active local calendar weeks', () => {
  const rows = [
    completion('1', '2026-08-04T12:00:00.000Z'),
    completion('2', '2026-07-28T12:00:00.000Z'),
    completion('3', '2026-07-21T12:00:00.000Z'),
  ];
  assert.equal(calculateWeeklyStreak(rows, new Date('2026-08-05T12:00:00.000Z'), 'UTC', 'user'), 3);
});

test('weekly streak returns zero when the current week has no qualifying action', () => {
  const rows = [completion('1', '2026-07-28T12:00:00.000Z')];
  assert.equal(calculateWeeklyStreak(rows, new Date('2026-08-05T12:00:00.000Z'), 'UTC', 'user'), 0);
});

test('weekly streak ignores another user and non-scoreable goals', () => {
  const rows = [
    completion('valid', '2026-08-04T12:00:00.000Z'),
    { ...completion('other', '2026-07-28T12:00:00.000Z'), userId: 'other-user' },
    { ...completion('archived', '2026-07-28T12:00:00.000Z'), goalStatus: 'archived' },
  ];
  assert.equal(calculateWeeklyStreak(rows, new Date('2026-08-05T12:00:00.000Z'), 'UTC', 'user'), 1);
});

test('calculation hashes are reproducible and independent of object key order', async () => {
  const first = await calculationHash({ a: 1, nested: { b: 2, c: 3 } });
  const second = await calculationHash({ nested: { c: 3, b: 2 }, a: 1 });
  assert.equal(first, second);
  assert.equal(first.length, 64);
});

test('changed canonical input produces a different trusted calculation hash', async () => {
  const first = await calculationHash({ algorithmVersion: 'momentum-v1.0', actions: [{ id: 'one' }] });
  const changed = await calculationHash({ algorithmVersion: 'momentum-v1.0', actions: [{ id: 'one' }, { id: 'two' }] });
  assert.notEqual(first, changed);
});
