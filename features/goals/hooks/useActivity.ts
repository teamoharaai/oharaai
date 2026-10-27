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
      setItems([]);

      try {
        const response = await authedFetch(`/api/goals/activity?goalId=${encodeURIComponent(goalId)}`);
        if (!response.ok) throw new Error('Failed to load activity');
        const data = (await response.json()) as ActivityResponse;
        if (!Array.isArray(data.items)) throw new Error('Invalid activity response');
        if (isActive) setItems(data.items);
      } catch (error) {
        if (isActive) setError(error instanceof UnauthorizedError ? 'Not authenticated' : 'Failed to load activity');
      } finally {
        if (isActive) setLoading(false);
      }
    }

    load();

    return () => {
      isActive = false;
    };
  }, [goalId]);

  return { items, loading, error };
}
