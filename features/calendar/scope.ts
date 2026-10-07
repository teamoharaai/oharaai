type GoalScopeRow = {
  project_lead_id?: string | null;
  user_id?: string | null;
};

type TaskScopeRow = {
  assigned_to?: string | null;
  created_by?: string | null;
  user_id?: string | null;
};

type MilestoneScopeRow = {
  created_by?: string | null;
  responsible_user_id?: string | null;
  user_id?: string | null;
};

/**
 * Calendar is a personal execution surface, even when RLS allows the viewer to
 * open a shared Project. Legacy personal rows predate created_by, so their
 * canonical owner remains the fallback only when no explicit creator exists.
 */
export function isTaskInViewerCalendar(task: TaskScopeRow, viewerId: string): boolean {
  return task.assigned_to === viewerId
    || task.created_by === viewerId
    || (task.created_by == null && task.user_id === viewerId);
}

export function isMilestoneInViewerCalendar(milestone: MilestoneScopeRow, viewerId: string): boolean {
  return milestone.responsible_user_id === viewerId
    || milestone.created_by === viewerId
    || (milestone.created_by == null && milestone.user_id === viewerId);
}

export function isGoalInViewerCalendar(goal: GoalScopeRow, viewerId: string): boolean {
  return goal.user_id === viewerId || goal.project_lead_id === viewerId;
}
