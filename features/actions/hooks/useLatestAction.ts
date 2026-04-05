import { useCallback, useEffect, useState } from 'react';
import supabase from '@/lib/db/client';
import type { ActionLog } from '../types';

interface ActionsResponse {
  items?: ActionLog[];
}

async function parseActionsResponse(response: Response): Promise<ActionLog[]> {
  const payload = (await response.json()) as ActionsResponse;
  return Array.isArray(payload.items) ? payload.items : [];
}

export function useLatestAction(goalId: string): {
  action: ActionLog | null;
  isLoading: boolean;
  isError: boolean;
  mutate: () => Promise<void>;
} {
  const [action, setAction] = useState<ActionLog | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  const loadLatestAction = useCallback(
    async (shouldThrow = false) => {
      if (!goalId) {
        setAction(null);
        setIsLoading(false);
        setIsError(false);
        return;
      }

      setIsLoading(true);
      setIsError(false);

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          throw new Error('Not authenticated');
        }

        const response = await fetch(
          `/api/actions?goal_id=${encodeURIComponent(goalId)}&status=pending&limit=1`,
          {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          },
        );

        if (!response.ok) {
          throw new Error('Failed to load action');
        }

        const items = await parseActionsResponse(response);
        setAction(items[0] ?? null);
      } catch (error) {
        setAction(null);
        setIsError(true);

        if (shouldThrow) {
          throw error;
        }
      } finally {
        setIsLoading(false);
      }
    },
    [goalId],
  );

  useEffect(() => {
    let isActive = true;

    if (!goalId) {
      setAction(null);
      setIsLoading(false);
      setIsError(false);
      return;
    }

    async function load() {
      setIsLoading(true);
      setIsError(false);

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          throw new Error('Not authenticated');
        }

        const response = await fetch(
          `/api/actions?goal_id=${encodeURIComponent(goalId)}&status=pending&limit=1`,
          {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          },
        );

        if (!response.ok) {
          throw new Error('Failed to load action');
        }

        const items = await parseActionsResponse(response);

        if (isActive) {
          setAction(items[0] ?? null);
          setIsError(false);
        }
      } catch {
        if (isActive) {
          setAction(null);
          setIsError(true);
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      isActive = false;
    };
  }, [goalId]);

  const mutate = useCallback(async () => {
    await loadLatestAction(true);
  }, [loadLatestAction]);

  return {
    action,
    isLoading,
    isError,
    mutate,
  };
}
