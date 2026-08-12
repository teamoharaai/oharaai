import type { GoalMilestone, GoalWithDetails } from './types';

export type GoalWorkspaceStatusFilter = 'all' | 'active' | 'paused' | 'completed';

export function goalMatchesWorkspaceStatus(
  goal: Pick<GoalWithDetails, 'status'>,
  status: GoalWorkspaceStatusFilter,
): boolean {
  if (status === 'all') return true;
  if (status === 'paused') return goal.status === 'stagnant';
  if (status === 'completed') return goal.status === 'complete';
  return goal.status === 'active';
}

export function filterGoalsForWorkspace(
  goals: readonly GoalWithDetails[],
  query: string,
  status: GoalWorkspaceStatusFilter,
  category: string | null,
): GoalWithDetails[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();

  return goals.filter((goal) => {
    if (!goalMatchesWorkspaceStatus(goal, status)) return false;
    if (category && goal.category !== category) return false;
    if (!normalizedQuery) return true;

    return [goal.title, goal.description ?? '', goal.category]
      .some((value) => value.toLocaleLowerCase().includes(normalizedQuery));
  });
}

export function getNextGoalMilestone(
  milestones: readonly GoalMilestone[],
): GoalMilestone | null {
  return [...milestones]
    .filter((milestone) => milestone.completedAt === null)
    .sort((left, right) => {
      const orderDifference = left.sortOrder - right.sortOrder;
      if (orderDifference !== 0) return orderDifference;
      const leftDue = left.dueDate?.getTime() ?? Number.POSITIVE_INFINITY;
      const rightDue = right.dueDate?.getTime() ?? Number.POSITIVE_INFINITY;
      return leftDue - rightDue;
    })[0] ?? null;
}

export function getGoalStatusLabel(status: GoalWithDetails['status']): string {
  switch (status) {
    case 'stagnant':
      return 'Paused';
    case 'complete':
      return 'Completed';
    case 'active':
      return 'Active';
    case 'draft':
      return 'Draft';
    case 'discovered':
      return 'Discovered';
    case 'archived':
      return 'Archived';
  }
}

export function getGoalCategoryLabel(category: GoalWithDetails['category']): string {
  if (category === 'health') return 'Health & Fitness';
  return category.charAt(0).toUpperCase() + category.slice(1);
}
