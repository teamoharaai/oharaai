import { useEffect } from 'react';
import { useGoalStore } from '../store';
import { fetchGoalById, fetchGoals } from '../services/goal-service';
import type { GoalWithMeasurables, ActivityEntry } from '../types';
import supabase from '@/lib/db/client';

export function useGoalDetail(goalId: string): {
  goal: GoalWithMeasurables | null;
  activityEntries: ActivityEntry[];
  isLoading: boolean;
} {
  const { goals, isLoading, setGoals, setIsLoading } = useGoalStore();
  const goal = goals.find((g) => g.id === goalId) ?? null;

  useEffect(() => {
    if (!goalId || isLoading) {
      return;
    }

    if (goals.length === 0 || !goal) {
      async function load() {
        setIsLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsLoading(false);
          return;
        }
        if (goals.length === 0) {
          const data = await fetchGoals(user.id);
          setGoals(data);
        } else {
          const data = await fetchGoalById(goalId);
          if (data) {
            setGoals([data, ...goals.filter((item) => item.id !== data.id)]);
          }
        }
        setIsLoading(false);
      }
      load();
    }
  }, [goal, goalId, goals, isLoading, setGoals, setIsLoading]);

  const activityEntries: ActivityEntry[] = [];

  return { goal, activityEntries, isLoading };
}
