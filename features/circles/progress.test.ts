import assert from 'node:assert/strict';
import test from 'node:test';
import type { ViewMilestone } from './progress.ts';
import { milestoneLabel, milestoneProgress, weeklyTaskLabel } from './progress.ts';

const milestones = (...done: boolean[]): ViewMilestone[] =>
  done.map((d, i) => ({ title: `Milestone ${i}`, done: d }));

// ---------------------------------------------------------------------------
// milestoneProgress — completed / total, ratio null when empty (CD-003)
// ---------------------------------------------------------------------------

test('milestoneProgress counts completed over total', () => {
  assert.deepEqual(milestoneProgress(milestones(true, false, true)), {
    done: 2,
    total: 3,
    ratio: 2 / 3,
  });
  assert.deepEqual(milestoneProgress(milestones(true, true)), { done: 2, total: 2, ratio: 1 });
});

test('milestoneProgress ratio is null (not 0%) when there are no milestones yet', () => {
  assert.deepEqual(milestoneProgress([]), { done: 0, total: 0, ratio: null });
});

// ---------------------------------------------------------------------------
// milestoneLabel — "X of Y milestones" / "No milestones yet"
// ---------------------------------------------------------------------------

test('milestoneLabel renders the fraction, or "No milestones yet" when empty', () => {
  assert.equal(milestoneLabel(milestoneProgress(milestones(true, false, false))), '1 of 3 milestones');
  assert.equal(milestoneLabel(milestoneProgress([])), 'No milestones yet');
});

// ---------------------------------------------------------------------------
// weeklyTaskLabel — this week's count, graceful degradation at target 0
// ---------------------------------------------------------------------------

test('weeklyTaskLabel formats this week\'s Task count when there is a target', () => {
  assert.equal(weeklyTaskLabel({ weeklyTask: { done: 2, target: 5 } }), '2 / 5 this week');
  assert.equal(weeklyTaskLabel({ weeklyTask: { done: 0, target: 3 } }), '0 / 3 this week');
});

test('weeklyTaskLabel returns null when the Goal has no weekly Task (graceful degradation)', () => {
  assert.equal(weeklyTaskLabel({ weeklyTask: null }), null);
  assert.equal(weeklyTaskLabel({ weeklyTask: { done: 0, target: 0 } }), null);
});
