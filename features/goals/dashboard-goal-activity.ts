export type DashboardGoalActivity = {
  at: Date;
  label: string;
};

export type GoalActivityByGoalId = Readonly<Record<string, DashboardGoalActivity | null>>;

export type GoalLinkedEntryActivityRow = {
  goal_id: string | null;
  entries: {
    entry_type: 'note' | 'reflection';
    title: string;
    updated_at: string;
  } | Array<{
    entry_type: 'note' | 'reflection';
    title: string;
    updated_at: string;
  }>;
};

export type GoalCompletedActionRow = {
  goal_id: string | null;
  action_text: string;
  completed_at: string | null;
};

function entryLabel(entryType: 'note' | 'reflection', title: string): string {
  const cleanTitle = title.trim();
  if (entryType === 'reflection') {
    return cleanTitle ? `Reflected: ${cleanTitle}` : 'Logged reflection';
  }
  return cleanTitle ? `Updated note: ${cleanTitle}` : 'Updated note';
}

export function resolveGoalActivityByGoalId(
  goalIds: readonly string[],
  entryRows: readonly GoalLinkedEntryActivityRow[],
  actionRows: readonly GoalCompletedActionRow[],
): GoalActivityByGoalId {
  const result = Object.fromEntries(
    goalIds.map((goalId) => [goalId, null]),
  ) as Record<string, DashboardGoalActivity | null>;

  const consider = (goalId: string | null, candidate: DashboardGoalActivity) => {
    if (!goalId || !(goalId in result) || Number.isNaN(candidate.at.getTime())) return;
    const current = result[goalId];
    if (!current || candidate.at.getTime() > current.at.getTime()) result[goalId] = candidate;
  };

  for (const row of entryRows) {
    const entry = Array.isArray(row.entries) ? row.entries[0] : row.entries;
    if (!entry) continue;
    consider(row.goal_id, {
      at: new Date(entry.updated_at),
      label: entryLabel(entry.entry_type, entry.title),
    });
  }

  for (const row of actionRows) {
    if (!row.completed_at) continue;
    consider(row.goal_id, {
      at: new Date(row.completed_at),
      label: `Completed ${row.action_text.trim()}`,
    });
  }

  return result;
}
