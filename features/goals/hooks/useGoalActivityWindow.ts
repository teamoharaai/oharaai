import { useEffect, useState } from 'react';
import { authedFetch, UnauthorizedError } from '@/lib/api/client';
import type { ActivityDayBucket } from '@/lib/activity/goal-activity';

type ActivityWindowResponse = {
  buckets: ActivityDayBucket[];
};

/**
 * Loads the L1 goal-activity window (design/001 Part B) for the 7-day emblem row.
 * Mirrors useActivity: the component consumes `buckets` as props and never
 * touches the DB itself (features/CLAUDE.md rule 3).
 */
export function useGoalActivityWindow(goalId: string, days = 7): {
  buckets: ActivityDayBucket[];
  loading: boolean;
  error: string | null;
} {
  const [buckets, setBuckets] = useState<ActivityDayBucket[]>([]);
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
        response = await authedFetch(
          `/api/goals/activity-window?goalId=${encodeURIComponent(goalId)}&days=${days}`,
        );
      } catch (cause) {
        if (isActive) {
          setError(cause instanceof UnauthorizedError ? 'Not authenticated' : 'Failed to load activity');
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

      const data = (await response.json()) as ActivityWindowResponse;
      if (isActive) {
        setBuckets(data.buckets ?? []);
        setLoading(false);
      }
    }

    load();

    return () => {
      isActive = false;
    };
  }, [goalId, days]);

  return { buckets, loading, error };
}
