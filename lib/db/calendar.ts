import type { SupabaseClient } from '@supabase/supabase-js';
import type { CalendarItem, CalendarRange } from '@/features/calendar/types';
import { addLocalDays } from '@/lib/time/zoned-calendar';

type Row = Record<string, any>;

function related(row: unknown): Row | null {
  if (Array.isArray(row)) return (row[0] as Row | undefined) ?? null;
  return row && typeof row === 'object' ? row as Row : null;
}
function dateOnly(value: string): string {
  return value.slice(0, 10);
}

/**
 * Bounded, read-only projection of RLS-visible OHARA work into Calendar items.
 * It deliberately does not reconcile Task schedules or write snapshots: domain
 * writes own occurrence materialization, while Calendar only reads canonical rows.
 */
export async function fetchOharaCalendarItems(
  db: SupabaseClient,
  range: CalendarRange,
): Promise<CalendarItem[]> {
  const { data: goalRows, error: goalsError } = await db
    .from('goals')
    .select('id,title,deadline,project_id,visibility,status')
    .eq('status', 'active');
  if (goalsError) throw goalsError;

  const goals = (goalRows ?? []) as Row[];
  const goalIds = goals.map((goal) => goal.id as string);
  if (goalIds.length === 0) return [];
  const goalById = new Map(goals.map((goal) => [goal.id as string, goal]));

  const projectIds = [...new Set(goals.map((goal) => goal.project_id as string | null).filter(Boolean))] as string[];
  const projectsResult = projectIds.length
    ? await db.from('projects').select('id,title').in('id', projectIds)
    : { data: [], error: null };
  if (projectsResult.error) throw projectsResult.error;
  const projectById = new Map(((projectsResult.data ?? []) as Row[]).map((row) => [row.id as string, row.title as string]));

  const [occurrences, milestones] = await Promise.all([
    db
      .from('task_occurrences')
      .select('id,task_id,scheduled_local_date,scheduled_local_time,schedule_timezone,scheduled_at,status,tasks!inner(id,goal_id,title,status,milestone_id)')
      .in('tasks.goal_id', goalIds)
      .eq('tasks.status', 'active')
      .gte('scheduled_local_date', range.startDate)
      .lte('scheduled_local_date', range.endDate)
      .neq('status', 'cancelled'),
    db
      .from('milestones')
      .select('id,goal_id,title,due_date,completed_at')
      .in('goal_id', goalIds)
      .gte('due_date', range.startDate)
      .lte('due_date', range.endDate),
  ]);
  if (occurrences.error) throw occurrences.error;
  if (milestones.error) throw milestones.error;

  const items: CalendarItem[] = [];
  for (const row of (occurrences.data ?? []) as Row[]) {
    const task = related(row.tasks);
    const goal = task ? goalById.get(task.goal_id as string) : null;
    const scheduledDate = row.scheduled_local_date as string | null;
    if (!task || !goal || !scheduledDate) continue;
    const projectId = (goal.project_id as string | null) ?? null;
    const hasTime = typeof row.scheduled_local_time === 'string' && row.scheduled_local_time.length > 0;
    items.push({
      id: `task-occurrence:${row.id}`,
      sourceType: 'task_occurrence',
      sourceId: row.id,
      title: task.title,
      contextTitle: goal.title,
      startAt: hasTime && row.scheduled_at ? row.scheduled_at : scheduledDate,
      endAt: null,
      allDay: !hasTime,
      timezone: row.schedule_timezone ?? range.timezone,
      provider: 'ohara',
      calendarId: null,
      goalId: goal.id,
      projectId,
      projectTitle: projectId ? projectById.get(projectId) ?? null : null,
      taskId: task.id,
      occurrenceId: row.id,
      isOharaItem: true,
      isExternal: false,
      status: row.status,
      visibility: goal.visibility ?? 'private',
    });
  }

  for (const row of (milestones.data ?? []) as Row[]) {
    const goal = goalById.get(row.goal_id as string);
    if (!goal || !row.due_date) continue;
    const projectId = (goal.project_id as string | null) ?? null;
    items.push({
      id: `milestone:${row.id}`,
      sourceType: 'milestone',
      sourceId: row.id,
      title: row.title,
      contextTitle: goal.title,
      startAt: dateOnly(row.due_date),
      endAt: null,
      allDay: true,
      timezone: range.timezone,
      provider: 'ohara',
      calendarId: null,
      goalId: goal.id,
      projectId,
      projectTitle: projectId ? projectById.get(projectId) ?? null : null,
      taskId: null,
      occurrenceId: null,
      isOharaItem: true,
      isExternal: false,
      status: row.completed_at ? 'completed' : 'active',
      visibility: goal.visibility ?? 'private',
    });
  }

  for (const goal of goals) {
    if (!goal.deadline) continue;
    const deadline = dateOnly(goal.deadline as string);
    if (deadline < range.startDate || deadline > range.endDate) continue;
    const projectId = (goal.project_id as string | null) ?? null;
    items.push({
      id: `goal-deadline:${goal.id}`,
      sourceType: 'goal_deadline',
      sourceId: goal.id,
      title: `${goal.title} deadline`,
      contextTitle: goal.title,
      startAt: deadline,
      endAt: addLocalDays(deadline, 1),
      allDay: true,
      timezone: range.timezone,
      provider: 'ohara',
      calendarId: null,
      goalId: goal.id,
      projectId,
      projectTitle: projectId ? projectById.get(projectId) ?? null : null,
      taskId: null,
      occurrenceId: null,
      isOharaItem: true,
      isExternal: false,
      status: 'active',
      visibility: goal.visibility ?? 'private',
    });
  }

  return items.sort((a, b) => a.startAt.localeCompare(b.startAt) || a.title.localeCompare(b.title));
}
