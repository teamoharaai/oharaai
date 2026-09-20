import type { GoalMilestone, GoalStatus, GoalWithDetails } from './types';

export type GoalWorkspaceStatusFilter = 'active' | 'paused' | 'completed' | 'expired' | 'archived';

/** Recent visits are UI context; persisted edits/reflections/milestones provide the fallback. */
export function recentWorkspaceGoals(
  goals: readonly GoalWithDetails[],
  visits: Readonly<Record<string, number>>,
  selectedId: string | null,
): GoalWithDetails[] {
  const touched = (goal: GoalWithDetails) => Math.max(
    visits[goal.id] ?? 0,
    goal.updatedAt.getTime(),
    goal.reflected_at?.getTime() ?? 0,
    ...goal.milestones.map((milestone) => milestone.updatedAt.getTime()),
  );
  return [...goals].sort((a, b) => {
    if (a.id === b.id) return 0;
    if (a.id === selectedId) return -1;
    if (b.id === selectedId) return 1;
    return touched(b) - touched(a) || b.createdAt.getTime() - a.createdAt.getTime();
  }).slice(0, 3);
}

export function workspaceStatusToGoalStatus(status: GoalWorkspaceStatusFilter): GoalStatus {
  if (status === 'paused') return 'stagnant';
  if (status === 'completed') return 'complete';
  return status;
}

export function goalMatchesWorkspaceStatus(
  goal: Pick<GoalWithDetails, 'status'>,
  status: GoalWorkspaceStatusFilter,
): boolean {
  return goal.status === workspaceStatusToGoalStatus(status);
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
    .filter((milestone) => (
      milestone.completedAt === null
      && milestone.parentId === null
    ))
    .sort((left, right) => {
      const orderDifference = left.sortOrder - right.sortOrder;
      if (orderDifference !== 0) return orderDifference;
      const leftDue = left.dueDate?.getTime() ?? Number.POSITIVE_INFINITY;
      const rightDue = right.dueDate?.getTime() ?? Number.POSITIVE_INFINITY;
      return leftDue - rightDue;
    })[0] ?? null;
}

export type UpcomingGoalStep = {
  dueDate: Date;
  goalId: string;
  goalTitle: string;
  milestone: GoalMilestone;
};

/**
 * Returns one dated reminder per Goal: its next incomplete, top-level
 * milestone. Evidence children intentionally never become reminders.
 */
export function getUpcomingGoalSteps(
  goals: readonly Pick<GoalWithDetails, 'deadline' | 'id' | 'milestones' | 'title'>[],
): UpcomingGoalStep[] {
  return goals
    .flatMap((goal) => {
      const milestone = getNextGoalMilestone(goal.milestones);
      const dueDate = milestone?.dueDate ?? goal.deadline;
      return milestone && dueDate
        ? [{ dueDate, goalId: goal.id, goalTitle: goal.title, milestone }]
        : [];
    })
    .sort((left, right) => (
      left.dueDate.getTime() - right.dueDate.getTime()
      || left.goalTitle.localeCompare(right.goalTitle)
      || left.milestone.sortOrder - right.milestone.sortOrder
      || left.milestone.id.localeCompare(right.milestone.id)
    ));
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
    case 'expired':
      return 'Expired';
  }
}

export function getGoalCategoryLabel(category: GoalWithDetails['category']): string {
  if (category === 'health') return 'Health & Fitness';
  return category.charAt(0).toUpperCase() + category.slice(1);
}
