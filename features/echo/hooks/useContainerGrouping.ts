import { useMemo } from 'react';
import type { EchoFolder } from '@/types/echo-folder';
import type { EchoGoalOption } from '../types';

export type ContainerGoalGroup = {
  key: string;
  label: string;
  goals: EchoGoalOption[];
};

export type ContainerGrouping = {
  goalGroups: ContainerGoalGroup[];
  folders: EchoFolder[];
};

function groupGoalsByProject(goals: EchoGoalOption[]): ContainerGoalGroup[] {
  const groups: ContainerGoalGroup[] = [];
  const groupByKey = new Map<string, ContainerGoalGroup>();
  const ungrouped: EchoGoalOption[] = [];

  for (const goal of goals) {
    if (!goal.projectId) {
      ungrouped.push(goal);
      continue;
    }

    const existing = groupByKey.get(goal.projectId);
    if (existing) {
      existing.goals.push(goal);
      continue;
    }

    const group: ContainerGoalGroup = {
      key: goal.projectId,
      label: goal.projectTitle || 'Untitled Project',
      goals: [goal],
    };
    groupByKey.set(goal.projectId, group);
    groups.push(group);
  }

  if (ungrouped.length > 0) {
    groups.push({ key: 'standalone', label: 'Standalone Goals', goals: ungrouped });
  }

  return groups;
}

export function useContainerGrouping(
  goals: EchoGoalOption[],
  folders: EchoFolder[],
): ContainerGrouping {
  const goalGroups = useMemo(() => groupGoalsByProject(goals), [goals]);
  return { goalGroups, folders };
}
