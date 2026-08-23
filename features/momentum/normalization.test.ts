import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeActionCompletions, normalizeActionRecords, type RawActionCompletion } from './normalization.ts';
import { getMomentumWeek } from './time.ts';

const boundary = getMomentumWeek(new Date('2026-08-05T12:00:00.000Z'), 'UTC');

function row(overrides: Partial<RawActionCompletion> = {}): RawActionCompletion {
  return {
    completedAt: '2026-08-05T10:00:00.000Z',
    createdAt: '2026-08-04T10:00:00.000Z',
    dueDate: '2026-08-05',
    goalId: '10000000-0000-0000-0000-000000000001',
    goalStatus: 'active',
    id: '20000000-0000-0000-0000-000000000001',
    status: 'complete',
    userId: '30000000-0000-0000-0000-000000000001',
    ...overrides,
  };
}

test('duplicate source completions are deterministically excluded', () => {
  const events = normalizeActionCompletions([row(), row()], boundary);
  assert.equal(events.filter((event) => event.eligibility === 'included').length, 1);
  assert.equal(events[1].exclusionReason, 'DUPLICATE_EVENT');
});

test('outside-week and impossible timestamps are excluded with reason codes', () => {
  const events = normalizeActionCompletions([
    row({ id: '1', completedAt: '2026-08-10T00:00:00.000Z' }),
    row({ id: '2', createdAt: '2026-08-06T00:00:00.000Z' }),
  ], boundary);
  assert.deepEqual(events.map((event) => event.exclusionReason), ['OUTSIDE_WEEK', 'COMPLETED_BEFORE_CREATED']);
});

test('planned eligibility requires the same owner, scoreable goal, and due-date week', () => {
  const actions = normalizeActionRecords([
    row({ id: '1' }),
    row({ id: '2', dueDate: null }),
    row({ id: '3', dueDate: '2026-08-12' }),
    row({ id: '4', goalStatus: 'archived' }),
    row({ id: '5', userId: 'another-user' }),
  ], boundary, '30000000-0000-0000-0000-000000000001');
  assert.deepEqual(actions.map((action) => action.plannedExclusionReason), [
    null,
    'MISSING_OR_INVALID_DUE_DATE',
    'DUE_OUTSIDE_WEEK',
    'GOAL_NOT_SCOREABLE',
    'OWNER_MISMATCH',
  ]);
});

test('current-week commitments are not missed before their local due date', () => {
  const rows = normalizeActionRecords([
    row({ dueDate: '2026-08-07', status: 'pending', completedAt: null }),
    row({ id: 'due-today', dueDate: '2026-08-05', status: 'pending', completedAt: null }),
  ], boundary, '30000000-0000-0000-0000-000000000001', '2026-08-05', false);
  assert.equal(rows[0].plannedEligibility, 'excluded');
  assert.equal(rows[0].plannedExclusionReason, 'DUE_NOT_REACHED');
  assert.equal(rows[1].plannedEligibility, 'excluded');
  assert.equal(rows[1].plannedExclusionReason, 'DUE_NOT_REACHED');

  const afterDue = normalizeActionRecords([
    row({ dueDate: '2026-08-05', status: 'pending', completedAt: null }),
  ], boundary, '30000000-0000-0000-0000-000000000001', '2026-08-06');
  assert.equal(afterDue[0].plannedEligibility, 'included');

  const completedToday = normalizeActionRecords([
    row({ dueDate: '2026-08-05' }),
  ], boundary, '30000000-0000-0000-0000-000000000001', '2026-08-05', false);
  assert.equal(completedToday[0].plannedEligibility, 'included');
});
