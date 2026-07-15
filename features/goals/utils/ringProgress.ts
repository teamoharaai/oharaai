import type { Goal } from '../types';

/**
 * Progress for GoalRingCard's ring. When a deadline is set, the ring is a
 * pure time-decay timer — it fills toward 100% as `now` approaches
 * `deadline`, regardless of actual completion, reaching exactly 100% at the
 * deadline. Goals without a deadline do not render a ring.
 */
export function getGoalRingProgress(
  goal: Pick<Goal, 'deadline' | 'createdAt'>,
): number | null {
  if (!goal.deadline) return null;

  const created = goal.createdAt.getTime();
  const due = goal.deadline.getTime();
  if (due <= created) return 100;

  const elapsed = Date.now() - created;
  const total = due - created;
  return Math.min(100, Math.max(0, (elapsed / total) * 100));
}

/**
 * Resolves the progress-stroke color for deadline-driven goal rings.
 * Urgency escalates as the time-decay progress approaches its deadline.
 */
export function getRingColor(pct: number, themeColor: string): string {
  if (pct >= 90) return '#C0483A';
  if (pct >= 75) return '#E0863E';
  return themeColor;
}
