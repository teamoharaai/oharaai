import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Task,
  TaskMigrationComparison,
  TaskOccurrence,
  TaskSchedule,
} from '@/features/tasks/types';
import { buildTaskSections, dateInTimeZone } from '@/features/tasks/utils';
import {
  addLocalDays,
  localDateForInstant,
  normalizeTimezone,
  startOfIsoWeekYmd,
} from '@/lib/time/zoned-calendar';

type Row = Record<string, any>;

function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function mapTaskSchedule(row: Row): TaskSchedule {
  return {
    id: row.id,
    taskId: row.task_id,
    version: row.version,
    recurrenceKind: row.recurrence_kind,
    intervalCount: row.interval_count,
    weekdays: row.weekdays ?? [],
    targetCount: numberOrNull(row.target_count),
    startDate: row.start_date,
    endDate: row.end_date ?? null,
    localTime: row.local_time ?? null,
    timezone: row.timezone,
    isActive: row.is_active,
    source: row.source,
  };
}

export function mapTaskOccurrence(row: Row): TaskOccurrence {
  return {
    id: row.id,
    taskId: row.task_id,
    scheduleId: row.schedule_id ?? null,
    occurrenceKey: row.occurrence_key,
    scheduledLocalDate: row.scheduled_local_date ?? null,
    scheduledLocalTime: row.scheduled_local_time ?? null,
    scheduleTimezone: row.schedule_timezone ?? null,
    scheduledAt: row.scheduled_at ?? null,
    status: row.status,
    actualQuantity: numberOrNull(row.actual_quantity),
    note: row.note ?? null,
    completedAt: row.completed_at ?? null,
    skippedAt: row.skipped_at ?? null,
    source: row.source,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedBy: row.completed_by ?? null,
  };
}

export function mapTask(row: Row): Task {
  return {
    id: row.id,
    goalId: row.goal_id,
    milestoneId: row.milestone_id ?? null,
    title: row.title,
    description: row.description ?? null,
    completionMode: row.completion_mode,
    targetQuantity: numberOrNull(row.target_quantity),
    quantityUnit: row.quantity_unit ?? null,
    status: row.status,
    dueDate: row.due_date ?? null,
    source: row.source,
    legacyCurrentValue: numberOrNull(row.legacy_current_value),
    legacyFrequency: row.legacy_frequency ?? null,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at ?? null,
    archivedAt: row.archived_at ?? null,
    assignedTo: row.assigned_to ?? null,
    assignedBy: row.assigned_by ?? null,
    createdBy: row.created_by ?? null,
    schedules: (row.task_schedules ?? []).map(mapTaskSchedule)
      .sort((a: TaskSchedule, b: TaskSchedule) => b.version - a.version),
    occurrences: (row.task_occurrences ?? []).map(mapTaskOccurrence),
  };
}

const TASK_SELECT = '*, task_schedules(*), task_occurrences(*)';

export async function fetchGoalTasks(
  db: SupabaseClient,
  userId: string,
  goalId: string,
): Promise<Task[]> {
  const { data: definitions, error: definitionError } = await db
    .from('tasks')
    .select('id,status,task_schedules!left(id,is_active),goals!inner(status)')
    .eq('user_id', userId)
    .eq('goal_id', goalId);
  if (definitionError) throw definitionError;

  const reconciliationResults = await Promise.all((definitions ?? []).flatMap((row: Row) =>
    row.status === 'active' && row.goals?.status === 'active'
      && (row.task_schedules ?? []).some((item: Row) => item.is_active)
      ? [db.rpc('reconcile_task_occurrences_v1', { p_task_id: row.id })]
      : [],
  ));
  const reconciliationFailure = reconciliationResults.find((result) => result.error)?.error;
  if (reconciliationFailure) throw reconciliationFailure;

  const { data, error } = await db
    .from('tasks')
    .select(TASK_SELECT)
    .eq('user_id', userId)
    .eq('goal_id', goalId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row: Row) => mapTask(row));
}

export async function fetchTaskById(
  db: SupabaseClient,
  userId: string,
  taskId: string,
): Promise<Task | null> {
  const { data, error } = await db.from('tasks').select(TASK_SELECT)
    .eq('id', taskId).eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data ? mapTask(data as Row) : null;
}

export interface WeeklyTaskCount {
  done: number;
  target: number;
}
export type WeeklyTaskCountsByGoal = Record<string, WeeklyTaskCount>;

// This week's Task-occurrence count per goal for `userId`, in the owner's
// timezone with a Monday-start week — the canonical Circles progress rule
// (CD-003), mirroring circles_goal_summary (migration 053). `target` counts
// non-cancelled materialized occurrences whose scheduled_local_date falls in the
// current local week; `done` counts the completed ones. Only tasks with
// status = 'active' contribute. Goals with zero materialized occurrences this
// week are simply absent from the map — the caller omits the count rather than
// showing a wrong number (the pre-existing occurrence-gap caveat, OUTSTANDING).
export async function fetchWeeklyTaskCountsByGoal(
  db: SupabaseClient,
  userId: string,
  timezone: string | null | undefined,
): Promise<WeeklyTaskCountsByGoal> {
  const zone = normalizeTimezone(timezone);
  const todayYmd = localDateForInstant(new Date().toISOString(), zone);
  const weekStart = startOfIsoWeekYmd(todayYmd);
  const weekEnd = addLocalDays(weekStart, 7);

  const { data, error } = await db
    .from('task_occurrences')
    .select('status, tasks!inner(goal_id, status)')
    .eq('user_id', userId)
    .eq('tasks.status', 'active')
    .neq('status', 'cancelled')
    .gte('scheduled_local_date', weekStart)
    .lt('scheduled_local_date', weekEnd);
  if (error) throw error;

  const counts: WeeklyTaskCountsByGoal = {};
  for (const row of (data ?? []) as Row[]) {
    const task = Array.isArray(row.tasks) ? row.tasks[0] : row.tasks;
    const goalId: string | undefined = task?.goal_id;
    if (!goalId) continue;
    const entry = counts[goalId] ?? { done: 0, target: 0 };
    entry.target += 1;
    if (row.status === 'completed') entry.done += 1;
    counts[goalId] = entry;
  }
  return counts;
}

export interface TodayTaskItem {
  goalId: string;
  goalTitle: string;
  task: Task;
  occurrence: TaskOccurrence;
}

export async function fetchTodayTaskItems(
  db: SupabaseClient,
  userId: string,
): Promise<TodayTaskItem[]> {
  const { data: definitions, error: definitionError } = await db.from('tasks')
    .select('id,status,task_schedules!left(id,is_active),goals!inner(status)')
    .eq('user_id', userId).eq('status', 'active').eq('goals.status', 'active');
  if (definitionError) throw definitionError;
  const reconciliationResults = await Promise.all((definitions ?? []).flatMap((row: Row) =>
    (row.task_schedules ?? []).some((item: Row) => item.is_active)
      ? [db.rpc('reconcile_task_occurrences_v1', { p_task_id: row.id })]
      : [],
  ));
  const reconciliationFailure = reconciliationResults.find((result) => result.error)?.error;
  if (reconciliationFailure) throw reconciliationFailure;

  const { data, error } = await db.from('tasks')
    .select(`${TASK_SELECT}, goals!inner(id,title,status)`)
    .eq('user_id', userId).eq('status', 'active').eq('goals.status', 'active');
  if (error) throw error;
  const rows = (data ?? []) as Row[];
  const tasks = rows.map(mapTask);
  const sections = buildTaskSections(tasks);
  const completedToday = sections.completed.filter(({ occurrence }) => (
    occurrence.scheduledLocalDate !== null
    && occurrence.scheduledLocalDate === dateInTimeZone(occurrence.scheduleTimezone ?? 'UTC')
  ));
  const today = [...sections.today, ...completedToday];
  const titleByGoal = new Map(rows.map((row) => [row.goal_id, row.goals?.title ?? 'Goal']));
  return today.map(({ task, occurrence }) => ({
    goalId: task.goalId,
    goalTitle: titleByGoal.get(task.goalId) ?? 'Goal',
    task,
    occurrence,
  }));
}

async function exactCount(query: PromiseLike<{ count: number | null; error: unknown }>): Promise<number> {
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

export async function compareLegacyTaskMigration(
  db: SupabaseClient,
  userId: string,
  goalId: string,
): Promise<TaskMigrationComparison> {
  const { data: trackerRows, error: trackerError } = await db
    .from('trackers').select('id').eq('goal_id', goalId);
  if (trackerError) throw trackerError;
  const trackerIds = (trackerRows ?? []).map((row: Row) => row.id);
  const [trackers, trackerLogs, actions, trackerTasks, actionTasks] = await Promise.all([
    exactCount(db.from('trackers').select('*', { count: 'exact', head: true }).eq('goal_id', goalId)),
    trackerIds.length
      ? exactCount(db.from('tracker_logs').select('*', { count: 'exact', head: true }).in('tracker_id', trackerIds))
      : 0,
    exactCount(db.from('action_logs').select('*', { count: 'exact', head: true }).eq('goal_id', goalId).eq('user_id', userId)),
    exactCount(db.from('tasks').select('*', { count: 'exact', head: true }).eq('goal_id', goalId).eq('user_id', userId).eq('source', 'legacy_tracker')),
    exactCount(db.from('tasks').select('*', { count: 'exact', head: true }).eq('goal_id', goalId).eq('user_id', userId).eq('source', 'legacy_action')),
  ]);
  const { data: canonicalRows, error: canonicalError } = await db
    .from('tasks').select('id,source').eq('goal_id', goalId).eq('user_id', userId)
    .in('source', ['legacy_tracker', 'legacy_action']);
  if (canonicalError) throw canonicalError;
  const trackerTaskIds = (canonicalRows ?? []).filter((row: Row) => row.source === 'legacy_tracker').map((row: Row) => row.id);
  const actionTaskIds = (canonicalRows ?? []).filter((row: Row) => row.source === 'legacy_action').map((row: Row) => row.id);
  const [trackerOccurrences, actionOccurrences] = await Promise.all([
    trackerTaskIds.length
      ? exactCount(db.from('task_occurrences').select('*', { count: 'exact', head: true }).in('task_id', trackerTaskIds).eq('source', 'legacy_tracker'))
      : 0,
    actionTaskIds.length
      ? exactCount(db.from('task_occurrences').select('*', { count: 'exact', head: true }).in('task_id', actionTaskIds).eq('source', 'legacy_action'))
      : 0,
  ]);
  const differences: string[] = [];
  if (trackers !== trackerTasks) differences.push(`Tracker definitions ${trackers} → ${trackerTasks}`);
  if (trackerLogs !== trackerOccurrences) differences.push(`Tracker logs ${trackerLogs} → ${trackerOccurrences}`);
  if (actions !== actionTasks || actions !== actionOccurrences) {
    differences.push(`Action logs ${actions} → ${actionTasks} Tasks / ${actionOccurrences} occurrences`);
  }
  return {
    goalId,
    legacy: { trackers, trackerLogs, actions },
    canonical: { trackerTasks, trackerOccurrences, actionTasks, actionOccurrences },
    differences,
  };
}
