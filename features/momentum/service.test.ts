import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculateWeeklyStreak,
  calculationHash,
  latestMomentumHistory,
} from './services/momentum-service.ts';
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

test('history keeps only the latest revision for each weekly period and sorts chronologically', () => {
  const history = latestMomentumHistory([
    {
      algorithm_version: 'momentum-v1.0',
      next_value: 4,
      previous_value: 1,
      revision: 2,
      week_end: '2026-08-02',
      week_start: '2026-07-27',
    },
    {
      algorithm_version: 'momentum-v1.0',
      next_value: 1,
      previous_value: 0,
      revision: 1,
      week_end: '2026-07-26',
      week_start: '2026-07-20',
    },
    {
      algorithm_version: 'momentum-v1.0',
      next_value: 3,
      previous_value: 1,
      revision: 1,
      week_end: '2026-08-02',
      week_start: '2026-07-27',
    },
  ]);

  assert.deepEqual(history.map((point) => ({
    algorithmVersion: point.algorithmVersion,
    periodState: point.periodState,
    periodStart: point.periodStart,
    revision: point.revision,
    value: point.value,
  })), [
    { algorithmVersion: 'momentum-v1.0', periodState: 'closed', periodStart: '2026-07-20', revision: 1, value: 1 },
    { algorithmVersion: 'momentum-v1.0', periodState: 'closed', periodStart: '2026-07-27', revision: 2, value: 4 },
  ]);
});

test('history preserves recorded algorithm versions across the V1.0 to V1.1 boundary', () => {
  const history = latestMomentumHistory([
    {
      algorithm_version: 'ohara-momentum-v1.0', next_value: 68, previous_value: 64,
      revision: 1, week_end: '2026-08-02', week_start: '2026-07-27',
    },
    {
      algorithm_version: 'ohara-momentum-v1.1', next_value: 72, previous_value: 68,
      revision: 1, week_end: '2026-08-09', week_start: '2026-08-03',
    },
  ]);
  assert.deepEqual(history.map(({ algorithmVersion, periodState }) => ({ algorithmVersion, periodState })), [
    { algorithmVersion: 'ohara-momentum-v1.0', periodState: 'closed' },
    { algorithmVersion: 'ohara-momentum-v1.1', periodState: 'closed' },
  ]);
});

test('history handles empty and one-period datasets without fabricating points', () => {
  assert.deepEqual(latestMomentumHistory([]), []);
  assert.deepEqual(latestMomentumHistory([{
    algorithm_version: 'momentum-v1.0',
    next_value: '4.5192',
    previous_value: '0',
    revision: 1,
    week_end: '2026-08-02',
    week_start: '2026-07-27',
  }]).map((point) => point.value), [4.5192]);
});
