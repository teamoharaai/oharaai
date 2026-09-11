import { useEffect } from 'react';
import { useGoalStore } from '../store';
import { fetchGoals } from '../services/goal-service';
import supabase from '@/lib/db/client';
import { startPerformanceTimer, type LoadPhase } from '@/lib/diagnostics/performance';
import type { GoalStatus } from '../types';

export function useGoals(options?: { status?: GoalStatus }) {
  const { goals, isLoading, setGoals, setIsLoading } = useGoalStore();
  const requestedStatus = options?.status;

  useEffect(() => {
    async function load() {
      const phase: LoadPhase = goals.length === 0 ? 'initial-load' : 'refresh';
      const timing = startPerformanceTimer('goals.load', { phase });
      setIsLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          timing.end({ success: true, resultCount: 0, requestCount: 1 });
          setIsLoading(false);
          return;
        }
        const data = await fetchGoals(
          user.id,
          requestedStatus ? { status: requestedStatus } : undefined,
        );
        setGoals(data);
        timing.end({ success: true, resultCount: data.length, requestCount: 2 });
        setIsLoading(false);
      } catch (error) {
        timing.end({ success: false, requestCount: 2 });
        throw error;
      }
    }
    load();
  }, [requestedStatus, setGoals, setIsLoading]);

  return { goals, isLoading };
}
