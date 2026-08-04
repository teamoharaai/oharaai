import { MOMENTUM_PILLARS } from './types.ts';
import type {
  MomentumCalculationResult,
  MomentumConfig,
  MomentumActionInput,
  MomentumPillarName,
  MomentumPillarResult,
  MomentumReasonCode,
  MomentumWeeklyAggregates,
} from './types.ts';
import { localDateForInstant } from './time.ts';

export function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

function dynamicWeightedScore(
  components: ReadonlyArray<{ available: boolean; score: number; weight: number }>,
): number {
  const eligible = components.filter((component) => component.available);
  const totalWeight = eligible.reduce((sum, component) => sum + component.weight, 0);
  if (totalWeight === 0) return 0;
  return clamp(eligible.reduce(
    (sum, component) => sum + clamp(component.score) * (component.weight / totalWeight),
    0,
  ));
}

export function aggregateActionInputs(
  actions: readonly MomentumActionInput[],
  timezone: string,
): MomentumWeeklyAggregates {
  const eligiblePlanned = actions.filter((action) => action.plannedEligibility === 'included');
  const includedCompletions = actions.filter((action) => action.completionEligibility === 'included');
  const completedPlanned = eligiblePlanned.filter((action) => action.completionEligibility === 'included');
  const aggregates = {
    completedPlannedActions: completedPlanned.length,
    eligibleEventCount: includedCompletions.length,
    eligiblePlannedActions: eligiblePlanned.length,
    meaningfulActiveDays: new Set(includedCompletions.map((action) => localDateForInstant(action.completedAt!, timezone))).size,
    tasksCompleted: includedCompletions.length,
  };
  if (aggregates.completedPlannedActions < 0
    || aggregates.completedPlannedActions > aggregates.eligiblePlannedActions) {
    throw new Error('completed planned actions must be within the eligible planned-action set');
  }
  return aggregates;
}

export function calculateTaskBackedPillars(
  aggregates: MomentumWeeklyAggregates,
): Record<MomentumPillarName, MomentumPillarResult> {
  if (aggregates.eligiblePlannedActions < 0
    || aggregates.completedPlannedActions < 0
    || aggregates.completedPlannedActions > aggregates.eligiblePlannedActions) {
    throw new Error('completed planned actions must be within the eligible planned-action set');
  }
  const hasEvents = aggregates.eligibleEventCount > 0;
  const completionAvailable = aggregates.eligiblePlannedActions > 0;
  const completionRate = completionAvailable
    ? aggregates.completedPlannedActions / aggregates.eligiblePlannedActions
    : 0;
  const activeDayRate = aggregates.meaningfulActiveDays / 7;
  const consistencyScore = dynamicWeightedScore([
    { available: completionAvailable, score: completionRate * 100, weight: 0.55 },
    { available: hasEvents, score: activeDayRate * 100, weight: 0.25 },
    { available: false, score: 0, weight: 0.2 },
  ]);
  const consistencyReasons: MomentumReasonCode[] = [];
  if (completionRate >= 0.75) consistencyReasons.push('CONSISTENCY_HIGH');
  if (aggregates.meaningfulActiveDays >= 4) consistencyReasons.push('ACTIVE_DAYS_STRONG');

  const taskProgressScore = completionAvailable ? completionRate * 100 : 0;
  const progressScore = dynamicWeightedScore([
    { available: false, score: 0, weight: 0.45 },
    { available: false, score: 0, weight: 0.35 },
    { available: completionAvailable && hasEvents, score: taskProgressScore, weight: 0.2 },
  ]);

  const unavailable = (): MomentumPillarResult => ({
    available: false,
    components: {},
    reasonCodes: [],
    score: 0,
  });

  return {
    consistency: {
      available: hasEvents,
      components: {
        activeDayRate,
        completionRate: completionAvailable ? completionRate : null,
        routineRate: null,
      },
      reasonCodes: consistencyReasons,
      score: consistencyScore,
    },
    progress: {
      available: completionAvailable && hasEvents,
      components: {
        goalDeltaScore: null,
        milestoneScore: null,
        taskProgressScore: completionAvailable ? taskProgressScore : null,
      },
      reasonCodes: hasEvents ? ['GOAL_PROGRESS'] : [],
      score: progressScore,
    },
    reflection: unavailable(),
    initiative: unavailable(),
    resilience: unavailable(),
  };
}

export function calculateMomentum(input: {
  config: MomentumConfig;
  currentMomentum: number;
  pillars: Record<MomentumPillarName, MomentumPillarResult>;
}): MomentumCalculationResult {
  const { config, currentMomentum, pillars } = input;
  if (!Number.isFinite(currentMomentum) || currentMomentum < 0) {
    throw new Error('currentMomentum must be a finite non-negative number');
  }

  const eligible = MOMENTUM_PILLARS.filter((name) => pillars[name].available);
  const difficultyMultiplier = 1 + currentMomentum / config.difficultyScale;
  if (eligible.length === 0) {
    return {
      previousMomentum: currentMomentum,
      nextMomentum: currentMomentum,
      displayedMomentum: Math.round(currentMomentum),
      growthQualityScore: 0,
      difficultyMultiplier,
      weeklyGain: 0,
      weeklyDrag: 0,
      effectiveWeights: {},
      reasonCodes: ['NO_ELIGIBLE_ACTIVITY'],
      algorithmVersion: config.version,
    };
  }

  const availableWeight = eligible.reduce((sum, name) => sum + config.pillarWeights[name], 0);
  const effectiveWeights: Partial<Record<MomentumPillarName, number>> = {};
  let growthQualityScore = 0;
  for (const name of eligible) {
    const weight = config.pillarWeights[name] / availableWeight;
    effectiveWeights[name] = weight;
    growthQualityScore += clamp(pillars[name].score) * weight;
  }

  const weeklyGain = growthQualityScore / (config.gainDivisor * difficultyMultiplier);
  const weeklyDrag = currentMomentum * config.weeklyDragRate;
  const nextMomentum = Math.max(0, currentMomentum + weeklyGain - weeklyDrag);
  const reasons = [...new Set(eligible.flatMap((name) => pillars[name].reasonCodes))];
  if (reasons.length === 0) reasons.push('LOW_ELIGIBLE_ACTIVITY');

  return {
    previousMomentum: currentMomentum,
    nextMomentum,
    displayedMomentum: Math.round(nextMomentum),
    growthQualityScore,
    difficultyMultiplier,
    weeklyGain,
    weeklyDrag,
    effectiveWeights,
    reasonCodes: reasons,
    algorithmVersion: config.version,
  };
}
