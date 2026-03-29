import { useEffect } from 'react';
import { useGoalStore } from '../store';
import { fetchGoals } from '../services/goal-service';
import { MOCK_GOAL_ACTIVITIES } from '../services/mock-data';
import type { GoalWithMeasurables, ActivityEntry } from '../types';

export function useGoalDetail(goalId: string): {
  goal: GoalWithMeasurables | null;
  activityEntries: ActivityEntry[];
  isLoading: boolean;
} {
  const { goals, isLoading, setGoals, setIsLoading } = useGoalStore();

  useEffect(() => {
    if (goals.length === 0 && !isLoading) {
      setIsLoading(true);
      fetchGoals('mock-user').then((data) => {
        setGoals(data);
        setIsLoading(false);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goal = goals.find((g) => g.id === goalId) ?? null;
  const activityEntries: ActivityEntry[] = MOCK_GOAL_ACTIVITIES[goalId] ?? [];

  return { goal, activityEntries, isLoading };
}
