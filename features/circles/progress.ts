import type { SharedGoal, SharedMilestone } from './types';

export interface MilestoneProgress {
  done: number;
  total: number;
  /** 0–1, or null when the Goal has no milestones yet. */
  ratio: number | null;
}

/** Progress rule (option 2): completed milestones / total milestones. */
export function milestoneProgress(milestones: readonly SharedMilestone[]): MilestoneProgress {
  const done = milestones.filter((milestone) => milestone.done).length;
  return {
    done,
    total: milestones.length,
    ratio: milestones.length === 0 ? null : done / milestones.length,
  };
}

export function milestoneLabel(progress: MilestoneProgress): string {
  if (progress.total === 0) return 'No milestones yet';
  return `${progress.done} of ${progress.total} milestones`;
}

/** Shown beside milestone progress: this week's Task count, when the Goal has one. */
export function weeklyTaskLabel(goal: Pick<SharedGoal, 'weeklyTask'>): string | null {
  const task = goal.weeklyTask;
  return task ? `${task.done} / ${task.target} ${task.label}` : null;
}
