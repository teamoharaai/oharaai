import assert from 'node:assert/strict';
import test from 'node:test';
import { selectHomeGoalMomentum } from './home-snapshot.ts';

test('Home Momentum is a bounded projection of active published Goal scores', () => {
  const goals = [
    { id: 'active-low', title: 'Low', status: 'active' },
    { id: 'paused', title: 'Paused', status: 'stagnant' },
    { id: 'active-high', title: 'High', status: 'active' },
  ] as never;
  const summary = {
    goals: [
      { goalId: 'active-low', displayedValue: 42 },
      { goalId: 'paused', displayedValue: 99 },
      { goalId: 'active-high', displayedValue: 81 },
    ],
  } as never;
  assert.deepEqual(selectHomeGoalMomentum(summary, goals, 2).map((item) => item.title), ['High', 'Low']);
});
