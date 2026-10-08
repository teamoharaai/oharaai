import type { GoalWithDetails } from '@/features/goals/types';
import type { GoalMomentumSummary, MomentumHomeSummary } from './types';

export type HomeGoalMomentum = GoalMomentumSummary & { title: string };

export function selectHomeGoalMomentum(
  summary: MomentumHomeSummary | null,
  goals: readonly Pick<GoalWithDetails, 'id' | 'status' | 'title'>[],
  limit = 3,
): HomeGoalMomentum[] {
  if (!summary) return [];
  const byGoal = new Map(summary.goals.map((item) => [item.goalId, item]));
  return goals
    .filter((goal) => goal.status === 'active')
    .flatMap((goal) => {
      const momentum = byGoal.get(goal.id);
      return momentum ? [{ ...momentum, title: goal.title }] : [];
    })
    .sort((left, right) => right.displayedValue - left.displayedValue)
    .slice(0, limit);
}
