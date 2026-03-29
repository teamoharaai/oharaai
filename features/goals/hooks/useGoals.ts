import { useEffect } from 'react';
import { useGoalStore } from '../store';
import { fetchGoals } from '../services/goal-service';

export function useGoals() {
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

  return { goals, isLoading };
}
