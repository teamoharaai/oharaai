import type { MomentumWeekBoundary } from './types.ts';

export interface MomentumTaskRow {
  id: string;
  title: string;
  user_id: string;
  goal_id: string;
  completion_mode: 'binary' | 'quantity';
  target_quantity: number | string | null;
  status: string;
  due_date: string | null;
  source: 'user' | 'legacy_tracker' | 'legacy_action';
  legacy_tracker_id: string | null;
  legacy_action_log_id: string | null;
  legacy_current_value: number | string | null;
  legacy_frequency: string | null;
  legacy_tracker_type: string | null;
  legacy_status: string | null;
  created_at: string;
  task_schedules: Array<{
    id: string;
    recurrence_kind: 'daily' | 'weekly' | 'weekly_count';
    interval_count: number;
    weekdays: number[];
    is_active: boolean;
  }>;
  task_occurrences: Array<{
    id: string;
    schedule_id: string | null;
    scheduled_local_date: string | null;
    status: string;
    actual_quantity: number | string | null;
    completed_at: string | null;
    source: string;
    legacy_tracker_log_id: string | null;
    legacy_action_log_id: string | null;
    legacy_raw_value: number | string | null;
    created_at: string;
  }>;
}

export interface MomentumTrackerInput {
  currentValue: number;
  expectedOccurrences: number | null;
  frequency: string | null;
  goalId: string;
  id: string;
  targetValue: number | null;
  type: string;
}

export interface MomentumTrackerLogInput {
  id: string;
  loggedAt: string;
  trackerId: string;
  value: number;
}

export interface MomentumActionRow {
  actionText: string;
  completedAt: string | null;
  createdAt: string | null;
  dueDate: string | null;
  goalId: string;
  goalStatus: string | null;
  id: string;
  status: string | null;
  userId: string;
}

function numeric(value: number | string | null): number | null {
  if (value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function inBoundary(instant: string | null, boundary: MomentumWeekBoundary): boolean {
  const value = Date.parse(instant ?? '');
  return Number.isFinite(value)
    && value >= Date.parse(boundary.startInclusive)
    && value < Date.parse(boundary.endExclusive);
}

function occurrenceWasDue(
  occurrence: MomentumTaskRow['task_occurrences'][number],
  boundary: MomentumWeekBoundary,
  asOfLocalDate: string,
  closed: boolean,
  weeklyCount = false,
): boolean {
  const date = occurrence.scheduled_local_date;
  if (!date || date < boundary.weekStart || date > boundary.weekEnd) return false;
  // Migration 059 anchors a weekly quantity period at Monday (or its first
  // partial day), but the commitment is not due until the period ends Sunday.
  const dueDate = weeklyCount ? boundary.weekEnd : date;
  return closed ? dueDate <= asOfLocalDate : dueDate < asOfLocalDate || occurrence.status === 'completed';
}

export function adaptTasksToMomentum(
  rows: readonly MomentumTaskRow[],
  goalStatuses: ReadonlyMap<string, string>,
  boundary: MomentumWeekBoundary,
  asOfLocalDate: string,
  closed: boolean,
): {
  actions: MomentumActionRow[];
  trackers: MomentumTrackerInput[];
  trackerLogs: MomentumTrackerLogInput[];
  completedOccurrenceCount: number;
} {
  const actions: MomentumActionRow[] = [];
  const trackers: MomentumTrackerInput[] = [];
  const trackerLogs: MomentumTrackerLogInput[] = [];
  let completedOccurrenceCount = 0;

  for (const task of rows) {
    const schedules = task.task_schedules ?? [];
    const occurrences = task.task_occurrences ?? [];
    const trackerLike = task.source === 'legacy_tracker' || schedules.length > 0;
    const completedInBoundary = occurrences.filter((occurrence) => (
      occurrence.status === 'completed' && inBoundary(occurrence.completed_at, boundary)
    ));
    if (task.source !== 'legacy_tracker') completedOccurrenceCount += completedInBoundary.length;

    if (trackerLike) {
      const activeSchedule = schedules.find((schedule) => schedule.is_active)
        ?? [...schedules].sort((a, b) => b.id.localeCompare(a.id))[0];
      const type = task.source === 'legacy_tracker'
        ? task.legacy_tracker_type ?? (task.completion_mode === 'quantity' ? 'counter' : 'habit')
        : task.completion_mode === 'quantity' ? 'counter' : 'habit';
      trackers.push({
        currentValue: numeric(task.legacy_current_value) ?? 0,
        expectedOccurrences: occurrences.filter((occurrence) => (
          occurrence.schedule_id !== null
          && occurrenceWasDue(occurrence, boundary, asOfLocalDate, closed,
            schedules.find((schedule) => schedule.id === occurrence.schedule_id)?.recurrence_kind === 'weekly_count')
        )).length,
        frequency: task.source === 'legacy_tracker'
          ? task.legacy_frequency
          : activeSchedule?.recurrence_kind === 'daily' && activeSchedule.interval_count === 1
            ? 'daily'
            : activeSchedule ? 'weekly' : null,
        goalId: task.goal_id,
        id: task.id,
        targetValue: numeric(task.target_quantity),
        type,
      });
      trackerLogs.push(...completedInBoundary.map((occurrence) => ({
        id: occurrence.legacy_tracker_log_id ?? occurrence.id,
        loggedAt: occurrence.completed_at!,
        trackerId: task.id,
        value: numeric(occurrence.actual_quantity) ?? numeric(occurrence.legacy_raw_value) ?? 1,
      })));
      continue;
    }

    for (const occurrence of occurrences) {
      const legacyStatus = task.source === 'legacy_action' ? task.legacy_status : null;
      const status = occurrence.status === 'completed' ? 'complete'
        : occurrence.status === 'skipped' ? 'skipped'
          : legacyStatus ?? 'pending';
      actions.push({
        actionText: task.title ?? '',
        completedAt: occurrence.completed_at,
        createdAt: task.created_at,
        dueDate: occurrence.scheduled_local_date ?? task.due_date,
        goalId: task.goal_id,
        goalStatus: goalStatuses.get(task.goal_id) ?? null,
        id: occurrence.legacy_action_log_id ?? task.legacy_action_log_id ?? occurrence.id,
        status,
        userId: task.user_id,
      });
    }
  }
  return { actions, trackers, trackerLogs, completedOccurrenceCount };
}

export function explainMomentumTaskMapping(): Record<string, string> {
  return {
    binaryScheduledCompletion: 'routine.occurrence_completed through the Tracker-compatible evidence adapter',
    quantityCompletion: 'metric.recorded using the occurrence actual quantity',
    recurringAdherence: 'due/completed commitment units from materialized schedule occurrences',
    unscheduledCompletedTask: 'action.completed through the existing action normalization contract',
  };
}
