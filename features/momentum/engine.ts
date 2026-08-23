import {
  GOAL_DIFFICULTY_VERSION,
  GOAL_DIFFICULTY_WEIGHTS,
  GOAL_MOMENTUM_CONFIG,
  GOAL_PROGRESS_MODE_WEIGHTS,
  MOMENTUM_CATEGORY_CONFIG,
  MOMENTUM_CATEGORY_CONFIG_VERSION,
  OHARA_MOMENTUM_CONFIG,
} from './config.ts';
import type {
  GoalDifficultySnapshot,
  GoalDifficultySourceInput,
  GoalMomentumCalculationInput,
  GoalMomentumPillar,
  GoalMomentumResult,
  MomentumActionInput,
  MomentumReasonCode,
  MomentumWeeklyAggregates,
  OharaGoalEvidence,
  OharaMomentumCalculationInput,
  OharaMomentumComponent,
  OharaMomentumResult,
} from './types.ts';
import { localDateForInstant } from './time.ts';

const GOAL_PILLARS: readonly GoalMomentumPillar[] = [
  'consistency',
  'progress',
  'reflection',
  'initiative',
];
const OHARA_COMPONENTS: readonly OharaMomentumComponent[] = [
  'portfolioProgress',
  'milestoneVelocity',
  'growthCadence',
  'sustainedGrowth',
  'portfolioCoverage',
];

export function clamp(value: number, min = 0, max = 100): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function ratio(numerator: number, denominator: number): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return null;
  return clamp(numerator / denominator, 0, 1);
}

function dynamicWeightedScore(
  components: ReadonlyArray<{ score: number | null; weight: number }>,
): { effectiveWeights: number[]; score: number } {
  const availableWeight = components.reduce(
    (sum, component) => sum + (component.score === null ? 0 : component.weight),
    0,
  );
  if (availableWeight <= 0) return { effectiveWeights: components.map(() => 0), score: 0 };
  const effectiveWeights = components.map((component) => (
    component.score === null ? 0 : component.weight / availableWeight
  ));
  return {
    effectiveWeights,
    score: clamp(components.reduce((sum, component, index) => (
      sum + (component.score === null ? 0 : clamp(component.score) * effectiveWeights[index])
    ), 0)),
  };
}

function smooth(previousValue: number | null, rawScore: number, alpha: number): number {
  const boundedRaw = clamp(rawScore);
  return previousValue === null
    ? boundedRaw
    : clamp((1 - alpha) * clamp(previousValue) + alpha * boundedRaw);
}

function normalizedReferenceScore(value: number | null, reference: number): number | null {
  if (value === null || !Number.isFinite(value) || value < 0) return null;
  return clamp((value / Math.max(reference, 1)) * 60, 0, 100);
}

export function calculateGoalDifficultyProfile(
  sourceInputs: GoalDifficultySourceInput,
): GoalDifficultySnapshot {
  const category = MOMENTUM_CATEGORY_CONFIG[sourceInputs.category];
  const dimensions = {
    effort: normalizedReferenceScore(sourceInputs.effortMinutes, category.referenceEffortMinutes),
    duration: normalizedReferenceScore(sourceInputs.durationWeeks, category.referenceDurationWeeks),
    frequency: normalizedReferenceScore(sourceInputs.frequencyPerWeek, category.referenceFrequencyPerWeek),
    complexity: normalizedReferenceScore(
      sourceInputs.complexityMilestoneCount,
      category.referenceMilestones,
    ),
    magnitude: sourceInputs.magnitudeScore === null ? null : clamp(sourceInputs.magnitudeScore),
    externalDependency: sourceInputs.externalDependency === null
      ? null
      : sourceInputs.externalDependency === 'high'
        ? 100
        : sourceInputs.externalDependency === 'moderate'
          ? 60
          : 0,
  };
  const entries = Object.entries(GOAL_DIFFICULTY_WEIGHTS) as Array<[
    keyof typeof GOAL_DIFFICULTY_WEIGHTS,
    number,
  ]>;
  const weighted = dynamicWeightedScore(entries.map(([name, weight]) => ({
    score: dimensions[name],
    weight,
  })));
  const effectiveWeights = Object.fromEntries(entries.map(([name], index) => [
    name,
    weighted.effectiveWeights[index] || undefined,
  ]).filter(([, value]) => value !== undefined));
  const score = weighted.score;
  const band = score < 35 ? 'D1' : score < 60 ? 'D2' : score < 80 ? 'D3' : 'D4';
  return {
    band,
    category: sourceInputs.category,
    categoryConfigVersion: MOMENTUM_CATEGORY_CONFIG_VERSION,
    compositeScore: score,
    dimensions,
    effectiveWeights,
    goalMode: sourceInputs.goalMode,
    planRevisionKey: sourceInputs.planRevisionKey,
    sourceInputs,
    version: GOAL_DIFFICULTY_VERSION,
  };
}

function calculateConsistency(input: GoalMomentumCalculationInput['consistency']) {
  const completionRate = ratio(input.completedCommitmentUnits, input.dueCommitmentUnits);
  const onScheduleRate = ratio(input.completedOnScheduleUnits, input.completedCommitmentUnits);
  const cadenceAlignment = ratio(input.meaningfulActivePeriods, input.plannedActivePeriods);
  const result = dynamicWeightedScore([
    { score: completionRate === null ? null : completionRate * 100, weight: 0.65 },
    { score: onScheduleRate === null ? null : onScheduleRate * 100, weight: 0.20 },
    { score: cadenceAlignment === null ? null : cadenceAlignment * 100, weight: 0.15 },
  ]);
  return {
    components: { cadenceAlignment, completionRate, onScheduleRate },
    score: result.score,
  };
}

function calculateProgress(
  mode: GoalMomentumCalculationInput['goalMode'],
  input: GoalMomentumCalculationInput['progress'],
) {
  const weights = GOAL_PROGRESS_MODE_WEIGHTS[mode];
  const paceAttainment = input.expectedProgressDelta === null
    ? null
    : input.expectedProgressDelta <= 0
      ? null
      : ratio(input.actualProgressDelta ?? 0, input.expectedProgressDelta);
  const milestoneAttainment = ratio(input.completedMilestoneUnits, input.dueMilestoneUnits);
  const progressEvidence = ratio(
    input.completedProgressEvidenceUnits,
    input.expectedProgressEvidenceUnits,
  );
  const result = dynamicWeightedScore([
    { score: paceAttainment === null ? null : paceAttainment * 100, weight: weights.pace },
    { score: milestoneAttainment === null ? null : milestoneAttainment * 100, weight: weights.milestones },
    { score: progressEvidence === null ? null : progressEvidence * 100, weight: weights.evidence },
  ]);
  return {
    components: { milestoneAttainment, paceAttainment, progressEvidence },
    score: result.score,
  };
}

function calculateReflection(input: GoalMomentumCalculationInput['reflection']) {
  const reflectionCoverage = clamp(
    input.qualifiedReflectionCount / GOAL_MOMENTUM_CONFIG.reflectionWeeklyCap,
    0,
    1,
  );
  const weeklyReview = input.weeklyReviewCompleted ? 1 : 0;
  const reflectionToAction = input.reflectionToAction ? 1 : 0;
  return {
    components: { reflectionCoverage, reflectionToAction, weeklyReview },
    score: clamp(100 * (
      0.45 * reflectionCoverage + 0.35 * weeklyReview + 0.20 * reflectionToAction
    )),
  };
}

function calculateInitiative(input: GoalMomentumCalculationInput['initiative']) {
  const recoveryUnits = input.qualifyingDisruption
    ? 1.0 * input.returnAfterDisruptionCount + 0.8 * input.recoveryActionCount
    : 0;
  const initiativeUnits = Math.min(GOAL_MOMENTUM_CONFIG.initiativeUnitCap,
    input.weeklyIntentionCount
      + 0.8 * input.milestoneStartedCount
      + 0.8 * input.planAdaptedCount
      + 0.8 * input.scopeAdjustedCount
      + recoveryUnits
      + 0.6 * input.nextStepScheduledCount
      + 0.5 * input.obstacleIdentifiedCount);
  return {
    components: {
      initiativeUnits,
      qualifyingDisruption: input.qualifyingDisruption,
      recoveryUnits,
    },
    score: clamp(100 * initiativeUnits / GOAL_MOMENTUM_CONFIG.initiativeUnitCap),
  };
}

function goalReasonCodes(
  input: GoalMomentumCalculationInput,
  pillars: GoalMomentumResult['pillars'],
): MomentumReasonCode[] {
  const reasons: MomentumReasonCode[] = [];
  if (pillars.consistency >= 70) reasons.push('CONSISTENCY_ON_TRACK');
  if (input.consistency.dueCommitmentUnits > input.consistency.completedCommitmentUnits) {
    reasons.push('COMMITMENTS_MISSED');
  }
  if (pillars.progress >= 70) reasons.push('PACE_ON_TRACK');
  if (input.progress.completedMilestoneUnits > 0) reasons.push('MILESTONE_COMPLETED');
  if (input.reflection.qualifiedReflectionCount > 0) reasons.push('REFLECTION_ENGAGED');
  if (input.reflection.reflectionToAction) reasons.push('REFLECTION_TO_ACTION');
  if (input.initiative.planAdaptedCount > 0 || input.initiative.scopeAdjustedCount > 0) {
    reasons.push('PLAN_ADAPTED');
  }
  if (input.initiative.qualifyingDisruption && input.initiative.returnAfterDisruptionCount > 0) {
    reasons.push('RETURN_AFTER_DISRUPTION');
  }
  return reasons;
}

export function calculateGoalMomentum(input: GoalMomentumCalculationInput): GoalMomentumResult {
  const previous = input.previousValue === null ? null : clamp(input.previousValue);
  if (!input.hasEligibleEvidence && !input.hasDueCommitments) {
    const currentValue = previous ?? 0;
    return {
      algorithmVersion: GOAL_MOMENTUM_CONFIG.version,
      currentValue,
      displayedValue: Math.round(currentValue),
      effectiveWeights: { ...GOAL_MOMENTUM_CONFIG.pillarWeights },
      goalId: input.goalId,
      pillarComponents: {
        consistency: {}, progress: {}, reflection: {}, initiative: {},
      },
      pillars: { consistency: 0, progress: 0, reflection: 0, initiative: 0 },
      previousValue: previous,
      rawScore: currentValue,
      reasonCodes: ['NO_ELIGIBLE_ACTIVITY'],
      status: previous === null ? 'building' : 'paused',
      weeklyChange: 0,
    };
  }

  const consistency = calculateConsistency(input.consistency);
  const progress = calculateProgress(input.goalMode, input.progress);
  const reflection = calculateReflection(input.reflection);
  const initiative = calculateInitiative(input.initiative);
  const pillars = {
    consistency: consistency.score,
    progress: progress.score,
    reflection: reflection.score,
    initiative: initiative.score,
  };
  const unavailable = new Set(input.unavailablePillars ?? []);
  const availableWeight = GOAL_PILLARS.reduce((sum, name) => (
    sum + (unavailable.has(name) ? 0 : GOAL_MOMENTUM_CONFIG.pillarWeights[name])
  ), 0);
  if (availableWeight <= 0) {
    const currentValue = previous ?? 0;
    return {
      algorithmVersion: GOAL_MOMENTUM_CONFIG.version,
      currentValue,
      displayedValue: Math.round(currentValue),
      effectiveWeights: {},
      goalId: input.goalId,
      pillarComponents: {
        consistency: consistency.components,
        progress: progress.components,
        reflection: reflection.components,
        initiative: initiative.components,
      },
      pillars,
      previousValue: previous,
      rawScore: currentValue,
      reasonCodes: ['COMPONENT_UNAVAILABLE'],
      status: 'limited',
      weeklyChange: 0,
    };
  }
  const effectiveWeights = Object.fromEntries(GOAL_PILLARS.filter((name) => !unavailable.has(name)).map((name) => [
    name,
    GOAL_MOMENTUM_CONFIG.pillarWeights[name] / availableWeight,
  ])) as Partial<Record<GoalMomentumPillar, number>>;
  const rawScore = clamp(GOAL_PILLARS.reduce((sum, name) => (
    sum + pillars[name] * (effectiveWeights[name] ?? 0)
  ), 0));
  const currentValue = smooth(previous, rawScore, GOAL_MOMENTUM_CONFIG.smoothingAlpha);
  const reasons = goalReasonCodes(input, pillars);
  if (unavailable.size) reasons.push('COMPONENT_UNAVAILABLE');
  return {
    algorithmVersion: GOAL_MOMENTUM_CONFIG.version,
    currentValue,
    displayedValue: Math.round(currentValue),
    effectiveWeights,
    goalId: input.goalId,
    pillarComponents: {
      consistency: consistency.components,
      progress: progress.components,
      reflection: reflection.components,
      initiative: initiative.components,
    },
    pillars,
    previousValue: previous,
    rawScore,
    reasonCodes: [...new Set(reasons)],
    status: previous === null ? 'building' : unavailable.size ? 'limited' : 'active',
    weeklyChange: currentValue - (previous ?? 0),
  };
}

export function normalizePortfolioWeights(goals: readonly OharaGoalEvidence[]): Record<string, number> {
  if (!goals.length) return {};
  const supplied = goals.every((goal) => (
    goal.plannedCommitmentUnits !== null && goal.plannedCommitmentUnits >= 0
  )) && goals.some((goal) => (goal.plannedCommitmentUnits ?? 0) > 0);
  const base = goals.map((goal) => supplied ? goal.plannedCommitmentUnits ?? 0 : 1);
  let remaining = 1;
  const weights = new Array(goals.length).fill(0);
  const open = new Set(goals.map((_, index) => index));
  while (open.size) {
    const openBase = [...open].reduce((sum, index) => sum + base[index], 0);
    const capped = [...open].filter((index) => (
      openBase > 0 && remaining * base[index] / openBase > OHARA_MOMENTUM_CONFIG.maxSingleGoalPortfolioWeight
    ));
    if (!capped.length) {
      for (const index of open) {
        weights[index] = openBase > 0 ? remaining * base[index] / openBase : remaining / open.size;
      }
      break;
    }
    for (const index of capped) {
      weights[index] = OHARA_MOMENTUM_CONFIG.maxSingleGoalPortfolioWeight;
      remaining -= OHARA_MOMENTUM_CONFIG.maxSingleGoalPortfolioWeight;
      open.delete(index);
    }
    if (remaining <= 0) break;
  }
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  return Object.fromEntries(goals.map((goal, index) => [
    goal.goalId,
    total > 0 ? weights[index] / total : 1 / goals.length,
  ]));
}

function weightedGoalValue(
  goals: readonly OharaGoalEvidence[],
  weights: Record<string, number>,
  getter: (goal: OharaGoalEvidence) => number,
): number {
  return clamp(goals.reduce((sum, goal) => sum + getter(goal) * (weights[goal.goalId] ?? 0), 0));
}

export function calculateOharaMomentum(input: OharaMomentumCalculationInput): OharaMomentumResult {
  const previous = input.previousValue === null ? null : clamp(input.previousValue);
  if (!input.hasEligibleEvidence && !input.hasDueCommitments) {
    const currentValue = previous ?? 0;
    return {
      algorithmVersion: OHARA_MOMENTUM_CONFIG.version,
      components: {
        portfolioProgress: null,
        milestoneVelocity: null,
        growthCadence: null,
        sustainedGrowth: null,
        portfolioCoverage: null,
      },
      currentValue,
      displayedValue: Math.round(currentValue),
      effectiveWeights: {},
      portfolioGoalWeights: {},
      previousValue: previous,
      rawScore: currentValue,
      reasonCodes: ['NO_ELIGIBLE_ACTIVITY'],
      status: previous === null ? 'building' : 'paused',
      weeklyChange: 0,
    };
  }
  const eligibleGoals = input.goals.filter((goal) => goal.expectedMovement || goal.meaningfulMovement);
  const portfolioGoalWeights = normalizePortfolioWeights(eligibleGoals);
  const portfolioProgress = eligibleGoals.length
    ? weightedGoalValue(eligibleGoals, portfolioGoalWeights, (goal) => clamp(goal.normalizedProgressEvidence))
    : null;
  const milestoneGoals = eligibleGoals.filter((goal) => goal.dueMilestoneUnits > 0);
  const milestonePortfolioWeight = milestoneGoals.reduce((sum, goal) => (
    sum + (portfolioGoalWeights[goal.goalId] ?? 0)
  ), 0);
  const milestoneVelocity = milestonePortfolioWeight > 0
    ? clamp(milestoneGoals.reduce((sum, goal) => (
      sum + 100
        * clamp(goal.completedMilestoneUnits / goal.dueMilestoneUnits, 0, 1)
        * (portfolioGoalWeights[goal.goalId] ?? 0)
        / milestonePortfolioWeight
    ), 0))
    : null;
  const currentCadence = eligibleGoals.length
    ? eligibleGoals.filter((goal) => goal.meaningfulMovement).length / eligibleGoals.length
    : null;
  const growthCadence = currentCadence === null
    ? null
    : input.trailingCadence === null
      ? currentCadence * 100
      : clamp(100 * (0.60 * currentCadence + 0.40 * clamp(input.trailingCadence, 0, 1)));
  const movementWeeks = input.trailingMovementWeeks;
  const sustainedGrowth = movementWeeks.length < OHARA_MOMENTUM_CONFIG.minimumSustainedGrowthWeeks
    ? null
    : clamp(100 * movementWeeks.reduce((sum, week) => sum + (week.moved ? week.recencyWeight : 0), 0)
      / movementWeeks.reduce((sum, week) => sum + week.recencyWeight, 0));
  const expectedGoals = eligibleGoals.filter((goal) => goal.expectedMovement);
  const portfolioCoverage = expectedGoals.length
    ? clamp(100 * expectedGoals.filter((goal) => goal.meaningfulMovement).length / expectedGoals.length)
    : null;
  const components = {
    portfolioProgress,
    milestoneVelocity,
    growthCadence,
    sustainedGrowth,
    portfolioCoverage,
  };
  const availableWeight = OHARA_COMPONENTS.reduce((sum, name) => (
    sum + (components[name] === null ? 0 : OHARA_MOMENTUM_CONFIG.componentWeights[name])
  ), 0);
  const effectiveWeights = Object.fromEntries(OHARA_COMPONENTS.filter((name) => components[name] !== null).map((name) => [
    name,
    OHARA_MOMENTUM_CONFIG.componentWeights[name] / availableWeight,
  ])) as Partial<Record<OharaMomentumComponent, number>>;
  const rawScore = clamp(OHARA_COMPONENTS.reduce((sum, name) => (
    sum + (components[name] ?? 0) * (effectiveWeights[name] ?? 0)
  ), 0));
  const currentValue = smooth(previous, rawScore, OHARA_MOMENTUM_CONFIG.smoothingAlpha);
  const reasonCodes: MomentumReasonCode[] = [];
  if ((portfolioProgress ?? 0) >= 70) reasonCodes.push('PORTFOLIO_PROGRESS_STRONG');
  if ((growthCadence ?? 0) >= 70) reasonCodes.push('GROWTH_CADENCE_STEADY');
  if ((milestoneVelocity ?? 0) > 0) reasonCodes.push('MILESTONE_COMPLETED');
  if (availableWeight < 0.999) reasonCodes.push('COMPONENT_UNAVAILABLE');
  return {
    algorithmVersion: OHARA_MOMENTUM_CONFIG.version,
    components,
    currentValue,
    displayedValue: Math.round(currentValue),
    effectiveWeights,
    portfolioGoalWeights,
    previousValue: previous,
    rawScore,
    reasonCodes: [...new Set(reasonCodes)],
    status: previous === null ? 'building' : availableWeight < 0.999 ? 'limited' : 'active',
    weeklyChange: currentValue - (previous ?? 0),
  };
}

export function aggregateActionInputs(
  actions: readonly MomentumActionInput[],
  timezone: string,
): MomentumWeeklyAggregates {
  const eligiblePlanned = actions.filter((action) => action.plannedEligibility === 'included');
  const includedCompletions = actions.filter((action) => action.completionEligibility === 'included');
  const completedPlanned = eligiblePlanned.filter((action) => action.completionEligibility === 'included');
  if (completedPlanned.length > eligiblePlanned.length) {
    throw new Error('completed planned actions must be within the eligible planned-action set');
  }
  return {
    completedPlannedActions: completedPlanned.length,
    eligibleEventCount: includedCompletions.length,
    eligiblePlannedActions: eligiblePlanned.length,
    meaningfulActiveDays: new Set(includedCompletions.map((action) => (
      localDateForInstant(action.completedAt!, timezone)
    ))).size,
    tasksCompleted: includedCompletions.length,
  };
}
