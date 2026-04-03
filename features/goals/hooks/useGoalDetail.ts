import { useCallback, useEffect, useState } from 'react';
import { useGoalStore } from '../store';
import { fetchGoalById, fetchGoals, createMeasurable, updateMeasurable, deleteMeasurable } from '../services/goal-service';
import type { GoalWithMeasurables, ActivityEntry, MeasurableInput, MeasurableUpdates } from '../types';
import type { EchoEntry } from '@/features/echo/types';
import { getEntriesByGoalId } from '@/features/echo/services/echo-service';
import supabase from '@/lib/db/client';

export function useGoalDetail(goalId: string): {
  goal: GoalWithMeasurables | null;
  activityEntries: ActivityEntry[];
  echoEntries: EchoEntry[];
  isLoading: boolean;
  isEchoLoading: boolean;
  onSaveMeasurable: (measurableId: string, updates: MeasurableUpdates) => Promise<void>;
  onDeleteMeasurable: (measurableId: string) => Promise<void>;
  onAddMeasurable: (input: MeasurableInput) => Promise<void>;
  measurableError: string | null;
  clearMeasurableError: () => void;
} {
  const { goals, isLoading, setGoals, setIsLoading, upsertMeasurable, removeMeasurable } =
    useGoalStore();
  const [echoEntries, setEchoEntries] = useState<EchoEntry[]>([]);
  const [isEchoLoading, setIsEchoLoading] = useState(false);
  const [measurableError, setMeasurableError] = useState<string | null>(null);
  const goal = goals.find((g) => g.id === goalId) ?? null;

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

  useEffect(() => {
    if (!goalId) {
      setEchoEntries([]);
      setIsEchoLoading(false);
      return;
    }

    let isActive = true;

    async function loadEchoEntries() {
      setIsEchoLoading(true);
      const data = await getEntriesByGoalId(goalId);
      if (isActive) {
        setEchoEntries(data);
        setIsEchoLoading(false);
      }
    }

    loadEchoEntries();

    return () => {
      isActive = false;
    };
  }, [goalId]);

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

  const activityEntries: ActivityEntry[] = [];

  return {
    goal,
    activityEntries,
    echoEntries,
    isLoading,
    isEchoLoading,
    onSaveMeasurable,
    onDeleteMeasurable,
    onAddMeasurable,
    measurableError,
    clearMeasurableError,
  };
}
