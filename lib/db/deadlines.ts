import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * A deadline is either a pending milestone's target date or a Task's deadline
 * (a one-time Task's `due_date`, or a recurring Task/Reminder schedule's
 * `end_date`). Reminders are just binary weekly Tasks, so at the data layer the
 * only meaningful split is milestone vs task.
 */
export type DeadlineKind = 'milestone' | 'task';

export interface DeadlineDay {
  count: number;
  byKind: Record<DeadlineKind, number>;
}

/** Local-calendar `YYYY-MM-DD` → how many deadlines fall due that day. */
export type DeadlineDensity = Record<string, DeadlineDay>;

interface MilestoneDueRow {
  due_date: string | null;
}
interface TaskDueRow {
  due_date: string | null;
}
interface ScheduleEndRow {
  end_date: string | null;
}

/**
 * Cross-goal deadline density for `userId`, computed server-side (pattern of
 * `/api/home/summary`). Aggregates every future-facing due date across the
 * caller's ACTIVE goals into `{ date → { count, byKind } }`, feeding the amber
 * deadline calendar (distinct from the green engagement heatmap, which is
 * past-facing). Own rows only — RLS scopes them and the active-goal id set
 * narrows further.
 *
 * Sources (all plain `date` columns — no timezone conversion):
 *   - pending milestone `due_date` (a reached milestone is no longer looming),
 *   - active one-time Task `due_date`,
 *   - active recurring Task/Reminder schedule `end_date` (open-ended schedules
 *     have a null end_date and contribute no deadline).
 * A Task is either one-time or scheduled (never both — enforced by the RPCs), so
 * these sources never double-count a Task.
 */
export async function fetchGoalDeadlineDensity(
  db: SupabaseClient,
  userId: string,
): Promise<DeadlineDensity> {
  const { data: activeGoals, error: goalsError } = await db
    .from('goals')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'active');
  if (goalsError) throw goalsError;

  const goalIds = (activeGoals ?? []).map((goal) => (goal as { id: string }).id);
  if (goalIds.length === 0) return {};

  const density: DeadlineDensity = {};
  const add = (date: string | null, kind: DeadlineKind) => {
    if (!date) return;
    const day = density[date] ?? (density[date] = { count: 0, byKind: { milestone: 0, task: 0 } });
    day.count += 1;
    day.byKind[kind] += 1;
  };

  const [milestones, oneTimeTasks, schedules] = await Promise.all([
    db
      .from('milestones')
      .select('due_date')
      .in('goal_id', goalIds)
      .is('completed_at', null)
      .not('due_date', 'is', null),
    db
      .from('tasks')
      .select('due_date')
      .in('goal_id', goalIds)
      .eq('status', 'active')
      .not('due_date', 'is', null),
    db
      .from('task_schedules')
      .select('end_date, tasks!inner(goal_id, status)')
      .in('tasks.goal_id', goalIds)
      .eq('tasks.status', 'active')
      .eq('is_active', true)
      .not('end_date', 'is', null),
  ]);
  if (milestones.error) throw milestones.error;
  if (oneTimeTasks.error) throw oneTimeTasks.error;
  if (schedules.error) throw schedules.error;

  for (const row of (milestones.data ?? []) as MilestoneDueRow[]) add(row.due_date, 'milestone');
  for (const row of (oneTimeTasks.data ?? []) as TaskDueRow[]) add(row.due_date, 'task');
  for (const row of (schedules.data ?? []) as unknown as ScheduleEndRow[]) add(row.end_date, 'task');

  return density;
}
