import assert from 'node:assert/strict';
import test from 'node:test';
import { MOMENTUM_CONFIG_V1 } from './config.ts';
import { aggregateActionInputs, calculateMomentum, calculateTaskBackedPillars } from './engine.ts';
import type { MomentumActionInput, MomentumPillarName, MomentumPillarResult } from './types.ts';

function pillar(score: number, available = true): MomentumPillarResult {
  return { available, components: {}, reasonCodes: [], score };
}

function allPillars(score: number): Record<MomentumPillarName, MomentumPillarResult> {
  return {
    consistency: pillar(score), progress: pillar(score), reflection: pillar(score),
    initiative: pillar(score), resilience: pillar(score),
  };
}

function action(overrides: Partial<MomentumActionInput> = {}): MomentumActionInput {
  return {
    completedAt: '2026-08-05T12:00:00.000Z',
    completionEligibility: 'included',
    completionExclusionReason: null,
    createdAt: '2026-08-01T12:00:00.000Z',
    dueDate: '2026-08-05',
    goalId: 'goal',
    goalStatus: 'active',
    id: 'action',
    plannedEligibility: 'included',
    plannedExclusionReason: null,
    status: 'complete',
    userId: 'user',
    ...overrides,
  };
}

test('canonical strong new-user week gains approximately four points', () => {
  const result = calculateMomentum({ config: MOMENTUM_CONFIG_V1, currentMomentum: 0, pillars: allPillars(80) });
  assert.ok(Math.abs(result.weeklyGain - 4) < 1e-12);
  assert.ok(Math.abs(result.nextMomentum - 4) < 1e-12);
});

test('empty data holds Momentum stable with a reason code and no drag', () => {
  const unavailable = allPillars(0);
  for (const value of Object.values(unavailable)) value.available = false;
  const result = calculateMomentum({ config: MOMENTUM_CONFIG_V1, currentMomentum: 42, pillars: unavailable });
  assert.equal(result.nextMomentum, 42);
  assert.equal(result.weeklyDrag, 0);
  assert.deepEqual(result.reasonCodes, ['NO_ELIGIBLE_ACTIVITY']);
});

test('missing pillars dynamically reweight to one without penalizing unavailable features', () => {
  const pillars = allPillars(0);
  pillars.consistency = pillar(80);
  pillars.progress = pillar(60);
  pillars.reflection.available = false;
  pillars.initiative.available = false;
  pillars.resilience.available = false;
  const result = calculateMomentum({ config: MOMENTUM_CONFIG_V1, currentMomentum: 40, pillars });
  const sum = Object.values(result.effectiveWeights).reduce((total, value) => total + value, 0);
  assert.ok(Math.abs(sum - 1) < 1e-12);
  assert.ok(result.growthQualityScore > 60 && result.growthQualityScore < 80);
});

test('higher current Momentum never increases gain for the same GQS', () => {
  const low = calculateMomentum({ config: MOMENTUM_CONFIG_V1, currentMomentum: 10, pillars: allPillars(80) });
  const high = calculateMomentum({ config: MOMENTUM_CONFIG_V1, currentMomentum: 100, pillars: allPillars(80) });
  assert.ok(high.weeklyGain < low.weeklyGain);
});

test('pillar scores clamp and task-backed unavailable pillars remain unavailable', () => {
  const pillars = calculateTaskBackedPillars({
    completedPlannedActions: 1,
    eligibleEventCount: 5,
    eligiblePlannedActions: 1,
    meaningfulActiveDays: 8,
    tasksCompleted: 5,
  });
  assert.equal(pillars.consistency.score, 100);
  assert.equal(pillars.progress.score, 100);
  assert.equal(pillars.reflection.available, false);
});

test('unrelated and outside-denominator completions cannot inflate planned completion', () => {
  const aggregates = aggregateActionInputs([
    action({ id: 'planned-complete' }),
    action({ id: 'undated-complete', dueDate: null, plannedEligibility: 'excluded', plannedExclusionReason: 'MISSING_OR_INVALID_DUE_DATE' }),
    action({ id: 'outside-due-complete', dueDate: '2026-08-12', plannedEligibility: 'excluded', plannedExclusionReason: 'DUE_OUTSIDE_WEEK' }),
  ], 'UTC');
  assert.equal(aggregates.eligiblePlannedActions, 1);
  assert.equal(aggregates.completedPlannedActions, 1);
  assert.equal(aggregates.tasksCompleted, 3);
});

test('duplicate action input cannot double-count a planned completion', () => {
  const aggregates = aggregateActionInputs([
    action({ id: 'same' }),
    action({
      id: 'same',
      completionEligibility: 'excluded',
      completionExclusionReason: 'DUPLICATE_EVENT',
      plannedEligibility: 'excluded',
      plannedExclusionReason: 'DUPLICATE_ACTION',
    }),
  ], 'UTC');
  assert.equal(aggregates.eligiblePlannedActions, 1);
  assert.equal(aggregates.completedPlannedActions, 1);
  assert.equal(aggregates.tasksCompleted, 1);
});

test('planned-action invariant rejects a numerator above its denominator', () => {
  assert.throws(() => calculateTaskBackedPillars({
    completedPlannedActions: 2,
    eligibleEventCount: 2,
    eligiblePlannedActions: 1,
    meaningfulActiveDays: 1,
    tasksCompleted: 2,
  }), /eligible planned-action set/);
});

test('undated completions contribute active days without fabricating a planned-action rate', () => {
  const pillars = calculateTaskBackedPillars({
    completedPlannedActions: 0,
    eligibleEventCount: 2,
    eligiblePlannedActions: 0,
    meaningfulActiveDays: 2,
    tasksCompleted: 2,
  });
  assert.equal(pillars.consistency.available, true);
  assert.equal(pillars.consistency.components.completionRate, null);
  assert.equal(pillars.consistency.score, (2 / 7) * 100);
  assert.equal(pillars.progress.available, false);
  assert.equal(pillars.progress.components.taskProgressScore, null);
});

test('invalid negative current Momentum is rejected', () => {
  assert.throws(
    () => calculateMomentum({ config: MOMENTUM_CONFIG_V1, currentMomentum: -1, pillars: allPillars(80) }),
    /finite non-negative/,
  );
});
