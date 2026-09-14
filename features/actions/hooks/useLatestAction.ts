import { useCallback, useEffect, useState } from 'react';
import { authedFetch } from '@/lib/api/client';
import type { ActionLog } from '../types';

interface ActionsResponse {
  data?: Array<{
    id: string;
    goalId: string;
    title: string;
    completionMode: 'binary' | 'quantity';
    dueDate: string | null;
    createdAt: string;
    occurrences: Array<{ id: string; status: string; completedAt: string | null }>;
  }>;
}

async function parseActionsResponse(response: Response): Promise<ActionLog[]> {
  const payload = (await response.json()) as ActionsResponse;
  if (!Array.isArray(payload.data)) return [];
  return payload.data.flatMap((task) => {
    if (task.completionMode !== 'binary') return [];
    const occurrence = task.occurrences.find((item) => item.status === 'pending' || item.status === 'missed');
    return occurrence ? [{
      id: occurrence.id,
      goalId: task.goalId,
      userId: '',
      actionText: task.title,
      status: 'pending' as const,
      dueDate: task.dueDate,
      completedAt: occurrence.completedAt,
      createdAt: task.createdAt,
    }] : [];
  });
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
        const response = await authedFetch(
          `/api/tasks?goal_id=${encodeURIComponent(goalId)}`,
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
        const response = await authedFetch(
          `/api/tasks?goal_id=${encodeURIComponent(goalId)}`,
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
