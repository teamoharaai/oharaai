export const MOMENTUM_PILLARS = [
  'consistency',
  'progress',
  'reflection',
  'initiative',
  'resilience',
] as const;

export type MomentumPillarName = (typeof MOMENTUM_PILLARS)[number];

export type MomentumReasonCode =
  | 'CONSISTENCY_HIGH'
  | 'ACTIVE_DAYS_STRONG'
  | 'ROUTINE_ADHERENCE'
  | 'GOAL_PROGRESS'
  | 'MILESTONE_COMPLETED'
  | 'REFLECTION_ANALYTICAL'
  | 'REFLECTION_INTEGRATIVE'
  | 'WEEKLY_REVIEW_COMPLETED'
  | 'INTENTION_SET'
  | 'PLAN_ADAPTED'
  | 'OBSTACLE_IDENTIFIED'
  | 'RETURN_AFTER_DISRUPTION'
  | 'LOW_ELIGIBLE_ACTIVITY'
  | 'NO_ELIGIBLE_ACTIVITY';

export type MomentumEventType =
  | 'action.completed'
  | 'milestone.completed'
  | 'reflection.created'
  | 'weekly_review.completed'
  | 'goal.progress_updated'
  | 'goal.created'
  | 'goal.plan_adapted'
  | 'goal.next_step_scheduled'
  | 'obstacle.identified'
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
  deduplicationKey: string;
  eligibility: MomentumEventEligibility;
  exclusionReason: string | null;
  eventType: MomentumEventType;
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

export interface MomentumPillarResult {
  available: boolean;
  components: Record<string, number | null>;
  reasonCodes: MomentumReasonCode[];
  score: number;
}

export interface MomentumConfig {
  difficultyScale: number;
  gainDivisor: number;
  initiativeUnitCap: number;
  minimumEligibleEvents: number;
  pillarWeights: Record<MomentumPillarName, number>;
  reflectionWeeklyLimit: number;
  resilienceNeutralScore: number;
  version: string;
  weeklyDragRate: number;
}

export interface MomentumCalculationResult {
  algorithmVersion: string;
  difficultyMultiplier: number;
  displayedMomentum: number;
  effectiveWeights: Partial<Record<MomentumPillarName, number>>;
  growthQualityScore: number;
  nextMomentum: number;
  previousMomentum: number;
  reasonCodes: MomentumReasonCode[];
  weeklyDrag: number;
  weeklyGain: number;
}

export interface MomentumWeeklyAggregates {
  completedPlannedActions: number;
  eligibleEventCount: number;
  eligiblePlannedActions: number;
  meaningfulActiveDays: number;
  tasksCompleted: number;
}

export interface MomentumDiagnostic {
  algorithmVersion: string;
  boundary: MomentumWeekBoundary;
  calculationHash: string;
  excludedEvents: MomentumEvent[];
  includedEvents: MomentumEvent[];
  inputActions: MomentumActionInput[];
  inputEvents: MomentumEvent[];
  pillars: Record<MomentumPillarName, MomentumPillarResult>;
  reasonCodes: MomentumReasonCode[];
  weeklyAggregates: MomentumWeeklyAggregates;
  weeklyResult: MomentumCalculationResult;
}

export interface MomentumHomeSummary {
  algorithmVersion: string;
  currentValue: number | null;
  displayedValue: number | null;
  status: 'Building' | 'Steady' | 'Unavailable';
  tasksCompletedThisWeek: number;
  trendLabels: string[];
  trendPoints: number[];
  trend: 'up' | 'steady' | 'down' | 'unavailable';
  weekEnd: string;
  weekStart: string;
  weeklyChange: number | null;
  weeklyStreak: number;
}
