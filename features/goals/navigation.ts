import type { GoalWorkspaceStatusFilter } from './goals-workspace';

export function goalWorkspaceHref(
  goalId: string,
  status?: GoalWorkspaceStatusFilter,
  context?: { projectId?: string; taskId?: string },
): string {
  const statusQuery = status ? `&status=${encodeURIComponent(status)}` : '';
  const projectQuery = context?.projectId ? `&projectId=${encodeURIComponent(context.projectId)}` : '';
  const taskQuery = context?.taskId ? `&taskId=${encodeURIComponent(context.taskId)}` : '';
  return `/(app)/goals?goal=${encodeURIComponent(goalId)}${statusQuery}${projectQuery}${taskQuery}`;
}

export function getGoalWorkspaceSelection(params: {
  goal?: string | string[];
  selected?: string | string[];
}): string | null {
  const canonical = Array.isArray(params.goal) ? params.goal[0] : params.goal;
  const legacy = Array.isArray(params.selected) ? params.selected[0] : params.selected;
  return canonical || legacy || null;
}
