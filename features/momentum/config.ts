import type {
  GoalMomentumCategory,
  GoalMomentumMode,
  GoalMomentumPillar,
  OharaMomentumComponent,
} from './types.ts';

export const GOAL_MOMENTUM_VERSION = 'goal-momentum-v1.1' as const;
export const OHARA_MOMENTUM_VERSION = 'ohara-momentum-v1.1' as const;
export const GOAL_DIFFICULTY_VERSION = 'difficulty-v1.0' as const;
export const MOMENTUM_CATEGORY_CONFIG_VERSION = 'momentum-categories-v1.0' as const;

export const GOAL_MOMENTUM_CONFIG = Object.freeze({
  version: GOAL_MOMENTUM_VERSION,
  pillarWeights: {
    consistency: 0.30,
    progress: 0.30,
    reflection: 0.20,
    initiative: 0.20,
  } satisfies Record<GoalMomentumPillar, number>,
  smoothingAlpha: 0.40,
  initiativeUnitCap: 2.5,
  reflectionWeeklyCap: 2,
});

export const OHARA_MOMENTUM_CONFIG = Object.freeze({
  version: OHARA_MOMENTUM_VERSION,
  componentWeights: {
    portfolioProgress: 0.50,
    milestoneVelocity: 0.20,
    growthCadence: 0.15,
    sustainedGrowth: 0.10,
    portfolioCoverage: 0.05,
  } satisfies Record<OharaMomentumComponent, number>,
  smoothingAlpha: 0.35,
  maxSingleGoalPortfolioWeight: 0.40,
  minimumSustainedGrowthWeeks: 4,
});

export const GOAL_DIFFICULTY_WEIGHTS = Object.freeze({
  effort: 0.25,
  duration: 0.20,
  frequency: 0.15,
  complexity: 0.15,
  magnitude: 0.15,
  externalDependency: 0.10,
});

export const GOAL_PROGRESS_MODE_WEIGHTS: Record<GoalMomentumMode, {
  pace: number;
  milestones: number;
  evidence: number;
}> = Object.freeze({
  numeric_target: { pace: 0.55, milestones: 0.25, evidence: 0.20 },
  milestone_project: { pace: 0.25, milestones: 0.55, evidence: 0.20 },
  frequency_routine: { pace: 0.35, milestones: 0.15, evidence: 0.50 },
  maintenance: { pace: 0.25, milestones: 0.15, evidence: 0.60 },
  qualitative: { pace: 0.20, milestones: 0.45, evidence: 0.35 },
});

export interface MomentumCategoryConfig {
  canonicalCategory: GoalMomentumCategory;
  referenceDurationWeeks: number;
  referenceEffortMinutes: number;
  referenceFrequencyPerWeek: number;
  referenceMilestones: number;
}

export const MOMENTUM_CATEGORY_CONFIG: Record<GoalMomentumCategory, MomentumCategoryConfig> = Object.freeze({
  health_fitness: {
    canonicalCategory: 'health_fitness',
    referenceDurationWeeks: 12,
    referenceEffortMinutes: 45,
    referenceFrequencyPerWeek: 4,
    referenceMilestones: 4,
  },
  finance: {
    canonicalCategory: 'finance',
    referenceDurationWeeks: 26,
    referenceEffortMinutes: 30,
    referenceFrequencyPerWeek: 2,
    referenceMilestones: 4,
  },
  career: {
    canonicalCategory: 'career',
    referenceDurationWeeks: 26,
    referenceEffortMinutes: 60,
    referenceFrequencyPerWeek: 3,
    referenceMilestones: 5,
  },
  creative: {
    canonicalCategory: 'creative',
    referenceDurationWeeks: 16,
    referenceEffortMinutes: 60,
    referenceFrequencyPerWeek: 4,
    referenceMilestones: 5,
  },
  education: {
    canonicalCategory: 'education',
    referenceDurationWeeks: 16,
    referenceEffortMinutes: 60,
    referenceFrequencyPerWeek: 5,
    referenceMilestones: 5,
  },
  relationships: {
    canonicalCategory: 'relationships',
    referenceDurationWeeks: 12,
    referenceEffortMinutes: 30,
    referenceFrequencyPerWeek: 3,
    referenceMilestones: 3,
  },
  personal_growth: {
    canonicalCategory: 'personal_growth',
    referenceDurationWeeks: 12,
    referenceEffortMinutes: 20,
    referenceFrequencyPerWeek: 5,
    referenceMilestones: 4,
  },
});

const CATEGORY_ALIASES: Record<string, GoalMomentumCategory> = {
  body: 'health_fitness',
  health: 'health_fitness',
  health_fitness: 'health_fitness',
  money: 'finance',
  finance: 'finance',
  career: 'career',
  create: 'creative',
  creative: 'creative',
  mind: 'education',
  education: 'education',
  connect: 'relationships',
  relationships: 'relationships',
  contribute: 'personal_growth',
  growth: 'personal_growth',
  personal_growth: 'personal_growth',
};

export function normalizeMomentumCategory(category: string): GoalMomentumCategory {
  return CATEGORY_ALIASES[category.trim().toLowerCase()] ?? 'personal_growth';
}
