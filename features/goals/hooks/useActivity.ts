import { useEffect, useState } from 'react';
import { authedFetch, UnauthorizedError } from '@/lib/api/client';
import type { ActivityItem } from '@/types/activity';

type ActivityResponse = {
  items: ActivityItem[];
};

export function useActivity(goalId: string): {
  items: ActivityItem[];
  loading: boolean;
  error: string | null;
} {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!goalId) return;

    let isActive = true;

    async function load() {
      setLoading(true);
      setError(null);

      let response: Response;
      try {
        response = await authedFetch(`/api/goals/activity?goalId=${encodeURIComponent(goalId)}`);
      } catch (error) {
        if (isActive) {
          setError(error instanceof UnauthorizedError ? 'Not authenticated' : 'Failed to load activity');
          setLoading(false);
        }
        return;
      }

      if (!response.ok) {
        if (isActive) {
          setError('Failed to load activity');
          setLoading(false);
        }
        return;
      }

      const data = (await response.json()) as ActivityResponse;
      if (isActive) {
        setItems(data.items);
        setLoading(false);
      }
    }

    load();

    return () => {
      isActive = false;
    };
  }, [goalId]);

  return { items, loading, error };
}
