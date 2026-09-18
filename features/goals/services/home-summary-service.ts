import { authedFetch } from '@/lib/api/client';
import type { ReflectionTimestampsByGoalId } from '../active-goal-selectors';
import type { WeeklyTaskCountsByGoal } from './weekly-task-count-service';

/**
 * The goal-derived signals Home's Today's Focus needs, fetched in one
 * round-trip from `/api/home/summary` (Stage 2 aggregator). Both maps degrade
 * gracefully to empty — a missing goal id just omits its count / ordering hint.
 */
export interface HomeSummary {
  weeklyTaskCounts: WeeklyTaskCountsByGoal;
  reflectionTimestamps: ReflectionTimestampsByGoalId;
}

export async function fetchHomeSummary(): Promise<HomeSummary> {
  const res = await authedFetch('/api/home/summary');
  if (!res.ok) {
    throw new Error(`home-summary: server responded with status ${res.status}`);
  }
  const body = (await res.json()) as Partial<HomeSummary>;
  return {
    weeklyTaskCounts: body.weeklyTaskCounts ?? {},
    reflectionTimestamps: body.reflectionTimestamps ?? {},
  };
}
