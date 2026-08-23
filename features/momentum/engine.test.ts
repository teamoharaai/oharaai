import assert from 'node:assert/strict';
import test from 'node:test';
import {
  GOAL_DIFFICULTY_VERSION,
  GOAL_MOMENTUM_CONFIG,
  MOMENTUM_CATEGORY_CONFIG_VERSION,
  OHARA_MOMENTUM_CONFIG,
} from './config.ts';
import {
  aggregateActionInputs,
  calculateGoalDifficultyProfile,
  calculateGoalMomentum,
  calculateOharaMomentum,
  normalizePortfolioWeights,
} from './engine.ts';
import type {
  GoalDifficultySourceInput,
  GoalMomentumCalculationInput,
  GoalMomentumMode,
  GoalMomentumPillar,
  MomentumActionInput,
  OharaGoalEvidence,
} from './types.ts';

function difficulty(overrides: Partial<GoalDifficultySourceInput> = {}) {
  return calculateGoalDifficultyProfile({
    category: 'health_fitness',
    complexityMilestoneCount: 4,
    durationWeeks: 12,
    effortMinutes: 45,
    externalDependency: 'none',
    frequencyPerWeek: 4,
    goalId: 'goal',
    goalMode: 'frequency_routine',
    magnitudeScore: 60,
    planRevisionKey: 'revision-a',
    ...overrides,
  });
}

function goalInput(overrides: Partial<GoalMomentumCalculationInput> = {}): GoalMomentumCalculationInput {
  return {
    consistency: {
      completedCommitmentUnits: 4,
      completedOnScheduleUnits: 4,
      dueCommitmentUnits: 4,
      meaningfulActivePeriods: 4,
      plannedActivePeriods: 4,
    },
    difficultyProfile: difficulty(),
    goalId: 'goal',
    goalMode: 'frequency_routine',
    hasDueCommitments: true,
    hasEligibleEvidence: true,
    initiative: {
      milestoneStartedCount: 0,
      nextStepScheduledCount: 1,
      obstacleIdentifiedCount: 0,
      planAdaptedCount: 0,
      qualifyingDisruption: false,
      recoveryActionCount: 0,
      returnAfterDisruptionCount: 0,
      scopeAdjustedCount: 0,
      weeklyIntentionCount: 1,
    },
    previousValue: null,
    progress: {
      actualProgressDelta: 4,
      completedMilestoneUnits: 1,
      completedProgressEvidenceUnits: 4,
      dueMilestoneUnits: 1,
      expectedProgressDelta: 4,
      expectedProgressEvidenceUnits: 4,
    },
    reflection: {
      qualifiedReflectionCount: 2,
      reflectionToAction: true,
      weeklyReviewCompleted: true,
    },
    ...overrides,
  };
}

function evidence(overrides: Partial<OharaGoalEvidence> = {}): OharaGoalEvidence {
  return {
    completedMilestoneUnits: 1,
    dueMilestoneUnits: 1,
    expectedMovement: true,
    goalId: 'goal',
    meaningfulMovement: true,
    normalizedProgressEvidence: 80,
    plannedCommitmentUnits: 1,
    ...overrides,
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

test('V1 exposes the canonical 30/30/20/20 and 50/20/15/10/5 weights', () => {
  assert.equal(GOAL_MOMENTUM_CONFIG.version, 'goal-momentum-v1.1');
  assert.equal(OHARA_MOMENTUM_CONFIG.version, 'ohara-momentum-v1.1');
  assert.deepEqual(GOAL_MOMENTUM_CONFIG.pillarWeights, {
    consistency: 0.30, initiative: 0.20, progress: 0.30, reflection: 0.20,
  });
  assert.deepEqual(OHARA_MOMENTUM_CONFIG.componentWeights, {
    growthCadence: 0.15,
    milestoneVelocity: 0.20,
    portfolioCoverage: 0.05,
    portfolioProgress: 0.50,
    sustainedGrowth: 0.10,
  });
  assert.equal('resilience' in GOAL_MOMENTUM_CONFIG.pillarWeights, false);
});

test('Goal Momentum is bounded, precise internally, and rounded only for display', () => {
  const result = calculateGoalMomentum(goalInput({ previousValue: 35.1234 }));
  assert.ok(result.currentValue >= 0 && result.currentValue <= 100);
  assert.equal(result.currentValue, 0.6 * 35.1234 + 0.4 * result.rawScore);
  assert.equal(result.displayedValue, Math.round(result.currentValue));
});

test('Goal Momentum is deterministic across repeated inputs', () => {
  const input = goalInput();
  assert.deepEqual(calculateGoalMomentum(input), calculateGoalMomentum(input));
});

test('provisional recalculation always uses the same closed baseline without compounding', () => {
  const baseline = 60;
  const monday = calculateGoalMomentum(goalInput({
    previousValue: baseline,
    progress: { ...goalInput().progress, completedMilestoneUnits: 0, completedProgressEvidenceUnits: 1 },
  }));
  const tuesdayInput = goalInput({ previousValue: baseline });
  const tuesday = calculateGoalMomentum(tuesdayInput);
  const repeated = calculateGoalMomentum(tuesdayInput);
  assert.notEqual(monday.currentValue, tuesday.currentValue);
  assert.deepEqual(tuesday, repeated);
  assert.equal(tuesday.previousValue, baseline);
  assert.equal(tuesday.currentValue, 0.6 * baseline + 0.4 * tuesday.rawScore);
});

test('a milestone missed in a closed week can count when completed in the current provisional week', () => {
  const closed = calculateGoalMomentum(goalInput({
    consistency: { completedCommitmentUnits: 0, completedOnScheduleUnits: 0, dueCommitmentUnits: 1, meaningfulActivePeriods: 0, plannedActivePeriods: 1 },
    hasEligibleEvidence: false,
    previousValue: 65,
    progress: { ...goalInput().progress, completedMilestoneUnits: 0, completedProgressEvidenceUnits: 0 },
  }));
  const provisional = calculateGoalMomentum(goalInput({
    previousValue: closed.currentValue,
    progress: { ...goalInput().progress, completedMilestoneUnits: 1, completedProgressEvidenceUnits: 1 },
  }));
  assert.equal(provisional.previousValue, closed.currentValue);
  assert.ok(provisional.reasonCodes.includes('MILESTONE_COMPLETED'));
  assert.ok(provisional.pillars.progress > closed.pillars.progress);
  assert.notEqual(provisional.currentValue, closed.currentValue);

  const closedOhara = calculateOharaMomentum({
    goals: [evidence({ completedMilestoneUnits: 0, meaningfulMovement: false, normalizedProgressEvidence: closed.pillars.progress })],
    hasDueCommitments: true,
    hasEligibleEvidence: false,
    previousValue: 72,
    trailingCadence: null,
    trailingMovementWeeks: [],
  });
  const provisionalOhara = calculateOharaMomentum({
    goals: [evidence({ completedMilestoneUnits: 1, meaningfulMovement: true, normalizedProgressEvidence: provisional.pillars.progress })],
    hasDueCommitments: true,
    hasEligibleEvidence: true,
    previousValue: closedOhara.currentValue,
    trailingCadence: null,
    trailingMovementWeeks: [],
  });
  assert.notEqual(provisionalOhara.currentValue, closedOhara.currentValue);
});

test('brand-new users and goals build while established inactive scores pause', () => {
  const newGoal = calculateGoalMomentum(goalInput({ hasDueCommitments: false, hasEligibleEvidence: false, previousValue: null }));
  const newOhara = calculateOharaMomentum({
    goals: [], hasDueCommitments: false, hasEligibleEvidence: false,
    previousValue: null, trailingCadence: null, trailingMovementWeeks: [],
  });
  assert.equal(newGoal.status, 'building');
  assert.equal(newOhara.status, 'building');
});

test('week-close calculation matches the final provisional value for identical canonical inputs', () => {
  const finalProvisional = calculateGoalMomentum(goalInput({ previousValue: 64 }));
  const closed = calculateGoalMomentum(goalInput({ previousValue: 64 }));
  assert.deepEqual(closed, finalProvisional);
});

test('true inactivity pauses without decay while missed commitments calculate', () => {
  const paused = calculateGoalMomentum(goalInput({
    hasDueCommitments: false,
    hasEligibleEvidence: false,
    previousValue: 52.25,
  }));
  assert.equal(paused.status, 'paused');
  assert.equal(paused.currentValue, 52.25);
  assert.equal(paused.weeklyChange, 0);

  const missed = calculateGoalMomentum(goalInput({
    consistency: {
      completedCommitmentUnits: 0,
      completedOnScheduleUnits: 0,
      dueCommitmentUnits: 4,
      meaningfulActivePeriods: 0,
      plannedActivePeriods: 4,
    },
    hasEligibleEvidence: false,
    previousValue: 52.25,
  }));
  assert.notEqual(missed.status, 'paused');
  assert.equal(missed.pillars.consistency, 0);
  assert.notEqual(missed.currentValue, 52.25);
  assert.ok(missed.reasonCodes.includes('COMMITMENTS_MISSED'));

  const pausedOhara = calculateOharaMomentum({
    goals: [],
    hasDueCommitments: false,
    hasEligibleEvidence: false,
    previousValue: 72,
    trailingCadence: null,
    trailingMovementWeeks: [],
  });
  assert.equal(pausedOhara.status, 'paused');
  assert.equal(pausedOhara.currentValue, 72);
  assert.equal(pausedOhara.weeklyChange, 0);
});

test('top-level unavailable pillars are dynamically reweighted to one', () => {
  const result = calculateGoalMomentum(goalInput({ unavailablePillars: ['reflection'] }));
  const total = Object.values(result.effectiveWeights).reduce((sum, weight) => sum + (weight ?? 0), 0);
  assert.ok(Math.abs(total - 1) < 1e-12);
  assert.equal(result.effectiveWeights.reflection, undefined);
  assert.ok(result.reasonCodes.includes('COMPONENT_UNAVAILABLE'));
});

test('fully unavailable Goal evidence produces a stable limited result instead of NaN', () => {
  const result = calculateGoalMomentum(goalInput({
    previousValue: 42.125,
    unavailablePillars: ['consistency', 'progress', 'reflection', 'initiative'],
  }));
  assert.equal(result.status, 'limited');
  assert.equal(result.currentValue, 42.125);
  assert.equal(result.rawScore, 42.125);
  assert.equal(result.weeklyChange, 0);
  assert.deepEqual(result.effectiveWeights, {});
  assert.deepEqual(result.reasonCodes, ['COMPONENT_UNAVAILABLE']);
});

test('reflection coverage caps at two and does not reward spam', () => {
  const two = calculateGoalMomentum(goalInput({
    reflection: { qualifiedReflectionCount: 2, reflectionToAction: false, weeklyReviewCompleted: false },
  }));
  const twenty = calculateGoalMomentum(goalInput({
    reflection: { qualifiedReflectionCount: 20, reflectionToAction: false, weeklyReviewCompleted: false },
  }));
  assert.equal(two.pillars.reflection, twenty.pillars.reflection);
});

test('a qualified current-week Reflection updates Goal Momentum from the closed baseline', () => {
  const baseline = 65;
  const beforeReflection = calculateGoalMomentum(goalInput({
    previousValue: baseline,
    reflection: { qualifiedReflectionCount: 0, reflectionToAction: false, weeklyReviewCompleted: false },
  }));
  const afterReflection = calculateGoalMomentum(goalInput({
    previousValue: baseline,
    reflection: { qualifiedReflectionCount: 1, reflectionToAction: false, weeklyReviewCompleted: false },
  }));
  assert.ok(afterReflection.pillars.reflection > beforeReflection.pillars.reflection);
  assert.notEqual(afterReflection.currentValue, beforeReflection.currentValue);
  assert.equal(afterReflection.previousValue, baseline);
});

test('recovery units only count after a qualifying disruption', () => {
  const noDisruption = calculateGoalMomentum(goalInput({
    initiative: { ...goalInput().initiative, qualifyingDisruption: false, recoveryActionCount: 1, returnAfterDisruptionCount: 1 },
  }));
  const disruption = calculateGoalMomentum(goalInput({
    initiative: { ...goalInput().initiative, qualifyingDisruption: true, recoveryActionCount: 1, returnAfterDisruptionCount: 1 },
  }));
  assert.ok(disruption.pillars.initiative > noDisruption.pillars.initiative);
  assert.ok(disruption.reasonCodes.includes('RETURN_AFTER_DISRUPTION'));
});

for (const mode of ['numeric_target', 'milestone_project', 'frequency_routine', 'maintenance', 'qualitative'] as GoalMomentumMode[]) {
  test(`${mode} uses a bounded progress model`, () => {
    const result = calculateGoalMomentum(goalInput({ goalMode: mode }));
    assert.ok(result.pillars.progress >= 0 && result.pillars.progress <= 100);
  });
}

for (const category of ['health_fitness', 'finance', 'career', 'creative', 'education', 'relationships', 'personal_growth'] as const) {
  test(`${category} difficulty is category-relative and versioned`, () => {
    const result = difficulty({ category, goalId: category });
    assert.ok(result.compositeScore >= 0 && result.compositeScore <= 100);
    assert.equal(result.version, GOAL_DIFFICULTY_VERSION);
    assert.equal(result.categoryConfigVersion, MOMENTUM_CATEGORY_CONFIG_VERSION);
  });
}

test('difficulty reweights missing dimensions and changes with a plan revision', () => {
  const sparse = difficulty({ effortMinutes: null, magnitudeScore: null, planRevisionKey: 'one' });
  const changed = difficulty({ effortMinutes: null, magnitudeScore: null, planRevisionKey: 'two' });
  const total = Object.values(sparse.effectiveWeights).reduce((sum, weight) => sum + (weight ?? 0), 0);
  assert.ok(Math.abs(total - 1) < 1e-12);
  assert.notEqual(sparse.planRevisionKey, changed.planRevisionKey);
});

test('OHARA Momentum is a separate bounded portfolio model with smoothing', () => {
  const input = {
    goals: [evidence()],
    hasDueCommitments: true,
    hasEligibleEvidence: true,
    previousValue: 40,
    trailingCadence: 0.5,
    trailingMovementWeeks: [
      { moved: true, recencyWeight: 4 }, { moved: true, recencyWeight: 3 },
      { moved: false, recencyWeight: 2 }, { moved: true, recencyWeight: 1 },
    ],
  };
  const result = calculateOharaMomentum(input);
  assert.equal(result.currentValue, 0.65 * 40 + 0.35 * result.rawScore);
  assert.ok(result.currentValue >= 0 && result.currentValue <= 100);
});

test('OHARA reflection-only activity does not become portfolio progress', () => {
  const result = calculateOharaMomentum({
    goals: [evidence({ expectedMovement: false, meaningfulMovement: false })],
    hasDueCommitments: false,
    hasEligibleEvidence: false,
    previousValue: 61,
    trailingCadence: null,
    trailingMovementWeeks: [],
  });
  assert.equal(result.status, 'paused');
  assert.equal(result.currentValue, 61);
});

test('portfolio weighting caps a dominant goal at forty percent when three goals are eligible', () => {
  const goals = [
    evidence({ goalId: 'dominant', plannedCommitmentUnits: 90 }),
    evidence({ goalId: 'second', plannedCommitmentUnits: 5 }),
    evidence({ goalId: 'third', plannedCommitmentUnits: 5 }),
  ];
  const weights = normalizePortfolioWeights(goals);
  assert.ok(weights.dominant <= 0.4000000001);
  assert.ok(Math.abs(Object.values(weights).reduce((sum, value) => sum + value, 0) - 1) < 1e-12);
});

test('milestone velocity respects the capped portfolio allocation instead of milestone volume', () => {
  const result = calculateOharaMomentum({
    goals: [
      evidence({
        completedMilestoneUnits: 100,
        dueMilestoneUnits: 100,
        goalId: 'dominant',
        plannedCommitmentUnits: 90,
      }),
      evidence({
        completedMilestoneUnits: 0,
        dueMilestoneUnits: 1,
        goalId: 'second',
        plannedCommitmentUnits: 5,
      }),
      evidence({
        completedMilestoneUnits: 0,
        dueMilestoneUnits: 1,
        goalId: 'third',
        plannedCommitmentUnits: 5,
      }),
    ],
    hasDueCommitments: true,
    hasEligibleEvidence: true,
    previousValue: null,
    trailingCadence: null,
    trailingMovementWeeks: [],
  });
  assert.ok(Math.abs((result.components.milestoneVelocity ?? 0) - 40) < 1e-10);
});

test('portfolio weights are not affected by Goal Difficulty', () => {
  const weights = normalizePortfolioWeights([
    evidence({ goalId: 'health' }),
    evidence({ goalId: 'career' }),
    evidence({ goalId: 'relationships' }),
  ]);
  assert.deepEqual(weights, { career: 1 / 3, health: 1 / 3, relationships: 1 / 3 });
});

test('sustained growth remains unavailable until enough history exists', () => {
  const result = calculateOharaMomentum({
    goals: [evidence()],
    hasDueCommitments: true,
    hasEligibleEvidence: true,
    previousValue: null,
    trailingCadence: 1,
    trailingMovementWeeks: [{ moved: true, recencyWeight: 1 }],
  });
  assert.equal(result.components.sustainedGrowth, null);
  assert.ok(result.reasonCodes.includes('COMPONENT_UNAVAILABLE'));
});

test('unrelated completions cannot inflate the planned-action numerator', () => {
  const aggregates = aggregateActionInputs([
    action({ id: 'planned-complete' }),
    action({ id: 'undated', dueDate: null, plannedEligibility: 'excluded', plannedExclusionReason: 'MISSING_OR_INVALID_DUE_DATE' }),
    action({ id: 'outside', dueDate: '2026-08-12', plannedEligibility: 'excluded', plannedExclusionReason: 'DUE_OUTSIDE_WEEK' }),
  ], 'UTC');
  assert.equal(aggregates.eligiblePlannedActions, 1);
  assert.equal(aggregates.completedPlannedActions, 1);
  assert.equal(aggregates.tasksCompleted, 3);
});

test('duplicate action inputs do not double count', () => {
  const aggregates = aggregateActionInputs([
    action({ id: 'same' }),
    action({
      id: 'same',
      completionEligibility: 'excluded', completionExclusionReason: 'DUPLICATE_EVENT',
      plannedEligibility: 'excluded', plannedExclusionReason: 'DUPLICATE_ACTION',
    }),
  ], 'UTC');
  assert.equal(aggregates.completedPlannedActions, 1);
  assert.equal(aggregates.tasksCompleted, 1);
});

test('V1 result contracts expose only the four canonical pillars', () => {
  const pillars = Object.keys(calculateGoalMomentum(goalInput()).pillars).sort();
  assert.deepEqual(pillars, ['consistency', 'initiative', 'progress', 'reflection'] satisfies GoalMomentumPillar[]);
});
