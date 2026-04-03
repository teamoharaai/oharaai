import { useCallback, useEffect, useState } from 'react';
import { useGoalStore } from '../store';
import { fetchGoalById, fetchGoals, createMeasurable, updateMeasurable, deleteMeasurable } from '../services/goal-service';
import type { GoalWithMeasurables, MeasurableInput, MeasurableUpdates } from '../types';
import supabase from '@/lib/db/client';

export function useGoalDetail(goalId: string): {
  goal: GoalWithMeasurables | null;
  isLoading: boolean;
  onSaveMeasurable: (measurableId: string, updates: MeasurableUpdates) => Promise<void>;
  onDeleteMeasurable: (measurableId: string) => Promise<void>;
  onAddMeasurable: (input: MeasurableInput) => Promise<void>;
  onCompleteMeasurable: (measurableId: string) => Promise<void>;
  completedIds: Set<string>;
  measurableError: string | null;
  clearMeasurableError: () => void;
} {
  const { goals, isLoading, setGoals, setIsLoading, upsertGoal, upsertMeasurable, removeMeasurable } =
    useGoalStore();
  const [measurableError, setMeasurableError] = useState<string | null>(null);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const goal = goals.find((g) => g.id === goalId) ?? null;

  useEffect(() => {
    setCompletedIds(new Set());
  }, [goalId]);

  useEffect(() => {
    if (!goalId || isLoading) {
      return;
    }

    if (goals.length === 0 || !goal) {
      async function load() {
        setIsLoading(true);
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setIsLoading(false);
          return;
        }
        if (goals.length === 0) {
          const data = await fetchGoals(user.id);
          setGoals(data);
        } else {
          const data = await fetchGoalById(goalId);
          if (data) {
            setGoals([data, ...goals.filter((item) => item.id !== data.id)]);
          }
        }
        setIsLoading(false);
      }
      load();
    }
  }, [goal, goalId, goals, isLoading, setGoals, setIsLoading]);

  const clearMeasurableError = useCallback(() => setMeasurableError(null), []);

  const onSaveMeasurable = useCallback(
    async (measurableId: string, updates: MeasurableUpdates) => {
      const current = goals
        .find((g) => g.id === goalId)
        ?.measurables.find((m) => m.id === measurableId);
      if (!current) return;

      // Optimistic update
      upsertMeasurable(goalId, { ...current, ...updates });

      const saved = await updateMeasurable(measurableId, updates);
      if (!saved) {
        // Rollback
        upsertMeasurable(goalId, current);
        setMeasurableError('Failed to save changes. Please try again.');
      } else {
        // Sync with server state
        upsertMeasurable(goalId, saved);
      }
    },
    [goalId, goals, upsertMeasurable],
  );

  const onDeleteMeasurable = useCallback(
    async (measurableId: string) => {
      const current = goals
        .find((g) => g.id === goalId)
        ?.measurables.find((m) => m.id === measurableId);
      if (!current) return;

      // Optimistic remove
      removeMeasurable(goalId, measurableId);

      const ok = await deleteMeasurable(measurableId);
      if (!ok) {
        // Rollback
        upsertMeasurable(goalId, current);
        setMeasurableError('Failed to delete measurable. Please try again.');
      }
    },
    [goalId, goals, removeMeasurable, upsertMeasurable],
  );

  const onAddMeasurable = useCallback(
    async (input: MeasurableInput) => {
      const currentMeasurables = goals.find((g) => g.id === goalId)?.measurables ?? [];
      const sortOrder = currentMeasurables.length;

      const saved = await createMeasurable(goalId, { ...input, sortOrder });
      if (!saved) {
        setMeasurableError('Failed to add measurable. Please try again.');
        return;
      }
      upsertMeasurable(goalId, saved);
    },
    [goalId, goals, upsertMeasurable],
  );

  const onCompleteMeasurable = useCallback(
    async (measurableId: string) => {
      const currentGoal = goals.find((item) => item.id === goalId);
      if (!currentGoal) return;

      const measurable = currentGoal.measurables.find((item) => item.id === measurableId);
      if (!measurable || completedIds.has(measurableId)) return;

      setMeasurableError(null);
      setCompletedIds((prev) => new Set(prev).add(measurableId));

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setCompletedIds((prev) => {
          const next = new Set(prev);
          next.delete(measurableId);
          return next;
        });
        setMeasurableError('You need to be signed in to complete a milestone.');
        return;
      }

      try {
        const response = await fetch('/api/goals/complete-measurable', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ measurableId, goalId }),
        });

        const payload = (await response.json()) as
          | { success: true; progress: number }
          | { error?: string };

        if (!response.ok || !('success' in payload) || !payload.success) {
          const message = 'error' in payload ? payload.error : undefined;
          throw new Error(message ?? 'Failed to complete milestone');
        }

        upsertGoal({
          ...currentGoal,
          progress: payload.progress,
        });
      } catch (error) {
        setCompletedIds((prev) => {
          const next = new Set(prev);
          next.delete(measurableId);
          return next;
        });
        setMeasurableError(
          error instanceof Error ? error.message : 'Failed to complete milestone',
        );
      }
    },
    [completedIds, goalId, goals, upsertGoal],
  );

  return {
    goal,
    isLoading,
    onSaveMeasurable,
    onDeleteMeasurable,
    onAddMeasurable,
    onCompleteMeasurable,
    completedIds,
    measurableError,
    clearMeasurableError,
  };
}
