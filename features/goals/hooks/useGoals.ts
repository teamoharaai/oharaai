import { useEffect } from 'react';
import { useGoalStore } from '../store';
import { fetchGoals } from '../services/goal-service';
import supabase from '@/lib/db/client';
import { startPerformanceTimer, type LoadPhase } from '@/lib/diagnostics/performance';

export function useGoals() {
  const { goals, isLoading, setGoals, setIsLoading } = useGoalStore();

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
        const data = await fetchGoals(user.id);
        setGoals(data);
        timing.end({ success: true, resultCount: data.length, requestCount: 2 });
        setIsLoading(false);
      } catch (error) {
        timing.end({ success: false, requestCount: 2 });
        throw error;
      }
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { goals, isLoading };
}
