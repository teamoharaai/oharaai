import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveGoalActivityByGoalId } from './dashboard-goal-activity.ts';

test('uses only events carrying an explicit requested goal_id', () => {
  const result = resolveGoalActivityByGoalId(
    ['goal-1', 'goal-2'],
    [
      {
        goal_id: 'goal-1',
        entries: { entry_type: 'note', title: 'Training note', updated_at: '2026-08-02T12:00:00.000Z' },
      },
      {
        goal_id: 'unrelated-goal',
        entries: { entry_type: 'reflection', title: 'Newer reflection', updated_at: '2026-08-10T12:00:00.000Z' },
      },
    ],
    [],
  );

  assert.equal(result['goal-1']?.label, 'Updated note: Training note');
  assert.equal(result['goal-2'], null);
});

test('chooses the latest explicitly linked entry or completed action', () => {
  const result = resolveGoalActivityByGoalId(
    ['goal-1'],
    [{
      goal_id: 'goal-1',
      entries: { entry_type: 'reflection', title: 'Weekly check-in', updated_at: '2026-08-02T12:00:00.000Z' },
    }],
    [{
      goal_id: 'goal-1',
      action_text: 'Recovery run',
      completed_at: '2026-08-03T12:00:00.000Z',
    }],
  );

  assert.equal(result['goal-1']?.label, 'Completed Recovery run');
});
