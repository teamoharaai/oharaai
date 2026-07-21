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
 * Keeps deadline-driven goal rings on the caller's canonical accent.
 */
export function getRingColor(pct: number, themeColor: string): string {
  void pct;
  return themeColor;
}
