import type { CircleGoalSummary } from '@/lib/db/circles-core';

/** A milestone as a viewer sees it: title + done only (whitelisted, CD-004). */
export interface ViewMilestone {
  title: string;
  done: boolean;
}

export interface MilestoneProgress {
  done: number;
  total: number;
  /** 0–1, or null when the Goal has no milestones yet. */
  ratio: number | null;
}

/** Progress rule (option 2, CD-003): completed milestones / total milestones. */
export function milestoneProgress(milestones: readonly ViewMilestone[]): MilestoneProgress {
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
export function weeklyTaskLabel(goal: Pick<CircleGoalSummary, 'weeklyTask'>): string | null {
  const task = goal.weeklyTask;
  if (!task || task.target <= 0) return null;
  return `${task.done} / ${task.target} this week`;
}
