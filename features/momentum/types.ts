export const GOAL_MOMENTUM_PILLARS = [
  'consistency',
  'progress',
  'reflection',
  'initiative',
] as const;

export const OHARA_MOMENTUM_COMPONENTS = [
  'portfolioProgress',
  'milestoneVelocity',
  'growthCadence',
  'sustainedGrowth',
  'portfolioCoverage',
] as const;

export const GOAL_MOMENTUM_CATEGORIES = [
  'health_fitness',
  'finance',
  'career',
  'creative',
  'education',
  'relationships',
  'personal_growth',
] as const;

export const GOAL_MOMENTUM_MODES = [
  'numeric_target',
  'milestone_project',
  'frequency_routine',
  'maintenance',
  'qualitative',
] as const;

export type GoalMomentumPillar = (typeof GOAL_MOMENTUM_PILLARS)[number];
export type OharaMomentumComponent = (typeof OHARA_MOMENTUM_COMPONENTS)[number];
export type GoalMomentumCategory = (typeof GOAL_MOMENTUM_CATEGORIES)[number];
export type GoalMomentumMode = (typeof GOAL_MOMENTUM_MODES)[number];
export type MomentumScoreStatus = 'building' | 'active' | 'paused' | 'limited' | 'unavailable';
export type MomentumPeriodState = 'provisional' | 'closed';

export type MomentumReasonCode =
  | 'CONSISTENCY_ON_TRACK'
  | 'COMMITMENTS_MISSED'
  | 'PACE_ON_TRACK'
  | 'MILESTONE_COMPLETED'
  | 'REFLECTION_ENGAGED'
  | 'REFLECTION_TO_ACTION'
  | 'PLAN_ADAPTED'
  | 'RETURN_AFTER_DISRUPTION'
  | 'PORTFOLIO_PROGRESS_STRONG'
  | 'GROWTH_CADENCE_STEADY'
  | 'NO_ELIGIBLE_ACTIVITY'
  | 'COMPONENT_UNAVAILABLE';

export type MomentumEventType =
  | 'action.completed'
  | 'routine.occurrence_completed'
  | 'metric.recorded'
  | 'checkpoint.completed'
  | 'milestone.started'
  | 'milestone.completed'
  | 'reflection.created'
  | 'weekly_review.completed'
  | 'goal.progress_updated'
  | 'goal.created'
  | 'goal.plan_adapted'
  | 'goal.scope_adjusted'
  | 'goal.next_step_scheduled'
  | 'obstacle.identified'
  | 'goal.resumed'
  | 'recovery.action_completed';

export type MomentumEventEligibility = 'included' | 'excluded';

export interface MomentumActionInput {
  completedAt: string | null;
  completionEligibility: MomentumEventEligibility;
  completionExclusionReason: string | null;
  createdAt: string | null;
  dueDate: string | null;
  goalId: string;
  goalStatus: string | null;
  id: string;
  plannedEligibility: MomentumEventEligibility;
  plannedExclusionReason: string | null;
  status: string | null;
  userId: string;
}

export interface MomentumEvent {
  category?: GoalMomentumCategory;
  deduplicationKey: string;
  eligibility: MomentumEventEligibility;
  exclusionReason: string | null;
  eventType: MomentumEventType;
  goalId?: string;
  occurredAt: string;
  sourceEntityId: string;
  userId: string;
}

export interface MomentumWeekBoundary {
  endExclusive: string;
  startInclusive: string;
  weekEnd: string;
  weekStart: string;
  timezone: string;
}

export interface GoalDifficultySourceInput {
  category: GoalMomentumCategory;
  complexityMilestoneCount: number | null;
  durationWeeks: number | null;
  effortMinutes: number | null;
  externalDependency: 'none' | 'moderate' | 'high' | null;
  frequencyPerWeek: number | null;
  goalId: string;
  goalMode: GoalMomentumMode;
  magnitudeScore: number | null;
  planRevisionKey: string;
}

export interface GoalDifficultySnapshot {
  band: 'D1' | 'D2' | 'D3' | 'D4';
  category: GoalMomentumCategory;
  categoryConfigVersion: string;
  compositeScore: number;
  dimensions: {
    complexity: number | null;
    duration: number | null;
    effort: number | null;
    externalDependency: number | null;
    frequency: number | null;
    magnitude: number | null;
  };
  effectiveWeights: Partial<Record<keyof GoalDifficultySnapshot['dimensions'], number>>;
  goalMode: GoalMomentumMode;
  planRevisionKey: string;
  sourceInputs: GoalDifficultySourceInput;
  version: string;
}

export interface GoalConsistencyInput {
  completedCommitmentUnits: number;
  completedOnScheduleUnits: number;
  dueCommitmentUnits: number;
  meaningfulActivePeriods: number;
  plannedActivePeriods: number;
}

export interface GoalProgressInput {
  actualProgressDelta: number | null;
  completedMilestoneUnits: number;
  completedProgressEvidenceUnits: number;
  dueMilestoneUnits: number;
  expectedProgressDelta: number | null;
  expectedProgressEvidenceUnits: number;
}

export interface GoalReflectionInput {
  qualifiedReflectionCount: number;
  reflectionToAction: boolean;
  weeklyReviewCompleted: boolean;
}

export interface GoalInitiativeInput {
  milestoneStartedCount: number;
  nextStepScheduledCount: number;
  obstacleIdentifiedCount: number;
  planAdaptedCount: number;
  qualifyingDisruption: boolean;
  recoveryActionCount: number;
  returnAfterDisruptionCount: number;
  scopeAdjustedCount: number;
  weeklyIntentionCount: number;
}

export interface GoalMomentumCalculationInput {
  consistency: GoalConsistencyInput;
  difficultyProfile: GoalDifficultySnapshot;
  goalId: string;
  goalMode: GoalMomentumMode;
  hasDueCommitments: boolean;
  hasEligibleEvidence: boolean;
  initiative: GoalInitiativeInput;
  previousValue: number | null;
  progress: GoalProgressInput;
  reflection: GoalReflectionInput;
  unavailablePillars?: readonly GoalMomentumPillar[];
}

export interface GoalMomentumResult {
  algorithmVersion: string;
  currentValue: number;
  displayedValue: number;
  effectiveWeights: Partial<Record<GoalMomentumPillar, number>>;
  goalId: string;
  pillarComponents: Record<GoalMomentumPillar, Record<string, number | boolean | null>>;
  pillars: Record<GoalMomentumPillar, number>;
  previousValue: number | null;
  rawScore: number;
  reasonCodes: MomentumReasonCode[];
  status: Exclude<MomentumScoreStatus, 'unavailable'>;
  weeklyChange: number;
}

export interface OharaGoalEvidence {
  completedMilestoneUnits: number;
  dueMilestoneUnits: number;
  expectedMovement: boolean;
  goalId: string;
  meaningfulMovement: boolean;
  normalizedProgressEvidence: number;
  plannedCommitmentUnits: number | null;
}

export interface OharaMomentumCalculationInput {
  goals: readonly OharaGoalEvidence[];
  hasDueCommitments: boolean;
  hasEligibleEvidence: boolean;
  previousValue: number | null;
  trailingCadence: number | null;
  trailingMovementWeeks: readonly { moved: boolean; recencyWeight: number }[];
}

export interface OharaMomentumResult {
  algorithmVersion: string;
  components: Record<OharaMomentumComponent, number | null>;
  currentValue: number;
  displayedValue: number;
  effectiveWeights: Partial<Record<OharaMomentumComponent, number>>;
  portfolioGoalWeights: Record<string, number>;
  previousValue: number | null;
  rawScore: number;
  reasonCodes: MomentumReasonCode[];
  status: MomentumScoreStatus;
  weeklyChange: number;
}

export interface MomentumWeeklyAggregates {
  completedPlannedActions: number;
  eligibleEventCount: number;
  eligiblePlannedActions: number;
  meaningfulActiveDays: number;
  tasksCompleted: number;
}

export interface GoalMomentumDiagnostic {
  asOf: string;
  baselineScore: number | null;
  baselineSnapshotId: string | null;
  boundary: MomentumWeekBoundary;
  calculationScope: MomentumPeriodState;
  calculationHash: string;
  difficultyProfile: GoalDifficultySnapshot;
  excludedEvents: MomentumEvent[];
  includedEvents: MomentumEvent[];
  normalizedInput: GoalMomentumCalculationInput;
  result: GoalMomentumResult;
}

export interface OharaMomentumDiagnostic {
  asOf: string;
  baselineScore: number | null;
  baselineSnapshotId: string | null;
  boundary: MomentumWeekBoundary;
  calculationScope: MomentumPeriodState;
  calculationHash: string;
  normalizedInput: OharaMomentumCalculationInput;
  result: OharaMomentumResult;
  sourceGoalSnapshotIds: string[];
}

export interface MomentumReason {
  code: MomentumReasonCode;
  message: string;
}

export interface MomentumHistoryPoint {
  algorithmVersion: string;
  periodState: MomentumPeriodState;
  periodEnd: string;
  periodStart: string;
  previousValue: number;
  revision: number;
  value: number;
}

export interface GoalMomentumSummary {
  algorithmVersion: string;
  asOf: string;
  currentValue: number;
  difficulty: Pick<GoalDifficultySnapshot, 'band' | 'compositeScore' | 'version'>;
  displayedValue: number;
  goalId: string;
  history: MomentumHistoryPoint[];
  periodState: MomentumPeriodState;
  pillars: Record<GoalMomentumPillar, number>;
  reasons: MomentumReason[];
  status: Exclude<MomentumScoreStatus, 'unavailable'>;
  weekEnd: string;
  weekStart: string;
  weeklyChange: number;
}

export interface MomentumHomeSummary {
  algorithmVersion: string;
  asOf: string;
  components: Record<OharaMomentumComponent, number | null>;
  currentValue: number | null;
  displayedValue: number | null;
  goals: GoalMomentumSummary[];
  history: MomentumHistoryPoint[];
  periodState: MomentumPeriodState;
  reasons: MomentumReason[];
  status: MomentumScoreStatus;
  tasksCompletedThisWeek: number;
  trendLabels: string[];
  trendPoints: number[];
  trend: 'up' | 'steady' | 'down' | 'unavailable';
  weekEnd: string;
  weekStart: string;
  weeklyChange: number | null;
  weeklyStreak: number;
}
