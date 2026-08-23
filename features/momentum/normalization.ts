import type { MomentumActionInput, MomentumEvent, MomentumWeekBoundary } from './types.ts';

export const SCOREABLE_GOAL_STATUSES = ['active', 'complete', 'stagnant'] as const;

export interface RawActionCompletion {
  completedAt: string | null;
  createdAt: string | null;
  dueDate: string | null;
  goalId: string;
  goalStatus: string | null;
  id: string;
  status: string | null;
  userId: string;
}

function isLocalDate(value: string | null): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function goalIsScoreable(status: string | null): boolean {
  return SCOREABLE_GOAL_STATUSES.includes(status as (typeof SCOREABLE_GOAL_STATUSES)[number]);
}

export function normalizeActionRecords(
  rows: readonly RawActionCompletion[],
  boundary: MomentumWeekBoundary,
  expectedUserId: string,
  asOfLocalDate = boundary.weekEnd,
  includePendingDueOnAsOfDate = true,
): MomentumActionInput[] {
  const start = Date.parse(boundary.startInclusive);
  const end = Date.parse(boundary.endExclusive);
  const seen = new Set<string>();

  return [...rows]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((row) => {
      const duplicate = seen.has(row.id);
      let plannedExclusionReason: string | null = null;
      let completionExclusionReason: string | null = null;
      const completedTime = Date.parse(row.completedAt ?? '');
      const createdTime = Date.parse(row.createdAt ?? '');

      if (duplicate) plannedExclusionReason = 'DUPLICATE_ACTION';
      else if (row.userId !== expectedUserId) plannedExclusionReason = 'OWNER_MISMATCH';
      else if (!row.goalId) plannedExclusionReason = 'MISSING_GOAL';
      else if (!goalIsScoreable(row.goalStatus)) plannedExclusionReason = 'GOAL_NOT_SCOREABLE';
      else if (!isLocalDate(row.dueDate)) plannedExclusionReason = 'MISSING_OR_INVALID_DUE_DATE';
      else if (row.dueDate < boundary.weekStart || row.dueDate > boundary.weekEnd) plannedExclusionReason = 'DUE_OUTSIDE_WEEK';
      else if (row.dueDate > asOfLocalDate) plannedExclusionReason = 'DUE_NOT_REACHED';
      else if (!includePendingDueOnAsOfDate && row.dueDate === asOfLocalDate && row.status !== 'complete') plannedExclusionReason = 'DUE_NOT_REACHED';
      else if (!row.createdAt || !Number.isFinite(createdTime)) plannedExclusionReason = 'MISSING_CREATED_TIMESTAMP';
      else if (createdTime >= end) plannedExclusionReason = 'CREATED_AFTER_WEEK';

      if (duplicate) completionExclusionReason = 'DUPLICATE_EVENT';
      else if (row.userId !== expectedUserId) completionExclusionReason = 'OWNER_MISMATCH';
      else if (!row.goalId) completionExclusionReason = 'MISSING_GOAL';
      else if (!goalIsScoreable(row.goalStatus)) completionExclusionReason = 'GOAL_NOT_SCOREABLE';
      else if (row.status !== 'complete') completionExclusionReason = 'NOT_COMPLETED';
      else if (!row.completedAt || !Number.isFinite(completedTime)) completionExclusionReason = 'MISSING_COMPLETION_TIMESTAMP';
      else if (!row.createdAt || !Number.isFinite(createdTime)) completionExclusionReason = 'MISSING_CREATED_TIMESTAMP';
      else if (createdTime > completedTime) completionExclusionReason = 'COMPLETED_BEFORE_CREATED';
      else if (completedTime < start || completedTime >= end) completionExclusionReason = 'OUTSIDE_WEEK';

      seen.add(row.id);
      return {
        completedAt: row.completedAt,
        completionEligibility: completionExclusionReason ? 'excluded' : 'included',
        completionExclusionReason,
        createdAt: row.createdAt,
        dueDate: row.dueDate,
        goalId: row.goalId,
        goalStatus: row.goalStatus,
        id: row.id,
        plannedEligibility: plannedExclusionReason ? 'excluded' : 'included',
        plannedExclusionReason,
        status: row.status,
        userId: row.userId,
      } satisfies MomentumActionInput;
    });
}

export function actionCompletionEvents(actions: readonly MomentumActionInput[]): MomentumEvent[] {
  return actions
    .filter((action) => action.status === 'complete' || action.completedAt !== null)
    .map((action) => ({
      deduplicationKey: `action.completed:${action.id}`,
      eligibility: action.completionEligibility,
      exclusionReason: action.completionExclusionReason,
      eventType: 'action.completed',
      occurredAt: action.completedAt ?? action.createdAt ?? '',
      sourceEntityId: action.id,
      userId: action.userId,
    }));
}

export function normalizeActionCompletions(
  rows: readonly RawActionCompletion[],
  boundary: MomentumWeekBoundary,
  expectedUserId = rows[0]?.userId ?? '',
): MomentumEvent[] {
  return actionCompletionEvents(normalizeActionRecords(rows, boundary, expectedUserId));
}
