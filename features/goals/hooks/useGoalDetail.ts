import { useEffect } from 'react';
import { useGoalStore } from '../store';
import { fetchGoals } from '../services/goal-service';
import type { GoalWithMeasurables, ActivityEntry } from '../types';
import supabase from '@/lib/db/client';

export function useGoalDetail(goalId: string): {
  goal: GoalWithMeasurables | null;
  activityEntries: ActivityEntry[];
  isLoading: boolean;
} {
  const { goals, isLoading, setGoals, setIsLoading } = useGoalStore();

  useEffect(() => {
    if (goals.length === 0 && !isLoading) {
      async function load() {
        setIsLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsLoading(false);
          return;
        }
        const data = await fetchGoals(user.id);
        setGoals(data);
        setIsLoading(false);
      }
      load();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goal = goals.find((g) => g.id === goalId) ?? null;
  const activityEntries: ActivityEntry[] = [];

  return { goal, activityEntries, isLoading };
}
