import type { GoalWithDetails } from './types';

export type ReflectionTimestampsByGoalId = Readonly<Record<string, string | null>>;

export type EntryReflectionTimestampRow = {
  goal_id: string | null;
  entries: { updated_at: string } | Array<{ updated_at: string }>;
};

type ProjectTitleSource = {
  id: string;
  title: string;
};

export type ActiveDashboardGoal = GoalWithDetails & {
  lastReflectionAt: string | null;
  projectTitle?: string;
};

export function resolveEntryReflectionTimestamps(
  goalIds: readonly string[],
  rows: readonly EntryReflectionTimestampRow[],
): ReflectionTimestampsByGoalId {
  const latestByGoalId = Object.fromEntries(
    goalIds.map((goalId) => [goalId, null]),
  ) as Record<string, string | null>;

  for (const row of rows) {
    if (!row.goal_id || !(row.goal_id in latestByGoalId)) continue;
    const entry = Array.isArray(row.entries) ? row.entries[0] : row.entries;
    const timestamp = entry?.updated_at;
    const currentLatest = latestByGoalId[row.goal_id];
    if (
      timestamp
      && (!currentLatest || Date.parse(timestamp) > Date.parse(currentLatest))
    ) {
      latestByGoalId[row.goal_id] = timestamp;
    }
  }

  return latestByGoalId;
}

export function selectActiveGoals(goals: readonly GoalWithDetails[]): GoalWithDetails[] {
  return goals.filter((goal) => goal.status === 'active');
}

function compareFallbackOrder(a: GoalWithDetails, b: GoalWithDetails): number {
  const createdAtDifference = b.createdAt.getTime() - a.createdAt.getTime();
  return createdAtDifference || a.id.localeCompare(b.id);
}

export function orderActiveGoals(
  activeGoals: readonly GoalWithDetails[],
  reflectionTimestamps: ReflectionTimestampsByGoalId,
): Array<GoalWithDetails & { lastReflectionAt: string | null }> {
  return activeGoals
    .map((goal) => ({
      ...goal,
      lastReflectionAt: reflectionTimestamps[goal.id] ?? null,
    }))
    .sort((a, b) => {
      if (a.lastReflectionAt && b.lastReflectionAt) {
        const reflectionDifference =
          Date.parse(b.lastReflectionAt) - Date.parse(a.lastReflectionAt);
        return reflectionDifference || compareFallbackOrder(a, b);
      }
      if (a.lastReflectionAt) return -1;
      if (b.lastReflectionAt) return 1;
      return compareFallbackOrder(a, b);
    });
}

export function resolveActiveGoalProjectTitles(
  activeGoals: readonly (GoalWithDetails & { lastReflectionAt: string | null })[],
  projects: readonly ProjectTitleSource[],
): ActiveDashboardGoal[] {
  const projectTitlesById = new Map(projects.map((project) => [project.id, project.title]));

  return activeGoals.map((goal) => ({
    ...goal,
    projectTitle: goal.projectId
      ? projectTitlesById.get(goal.projectId)
      : undefined,
  }));
}

