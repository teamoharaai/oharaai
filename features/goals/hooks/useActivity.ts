import { useEffect, useState } from 'react';
import supabase from '@/lib/db/client';
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

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        if (isActive) {
          setError('Not authenticated');
          setLoading(false);
        }
        return;
      }

      let response: Response;
      try {
        response = await fetch(
          `/api/goals/activity?goalId=${encodeURIComponent(goalId)}`,
          {
            headers: { Authorization: `Bearer ${session.access_token}` },
          },
        );
      } catch {
        if (isActive) {
          setError('Failed to load activity');
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
