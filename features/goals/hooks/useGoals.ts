import { useEffect } from 'react';
import { useGoalStore } from '../store';
import { fetchGoals } from '../services/goal-service';
import supabase from '@/lib/db/client';

export function useGoals() {
  const { goals, isLoading, setGoals, setIsLoading } = useGoalStore();

  useEffect(() => {
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { goals, isLoading };
}
