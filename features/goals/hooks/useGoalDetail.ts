import { useCallback, useEffect, useState } from 'react';
import { useGoalStore } from '../store';
import { fetchGoalById, fetchGoals, createMeasurable, updateMeasurable, deleteMeasurable } from '../services/goal-service';
import type { GoalWithMeasurables, ActivityEntry, MeasurableInput, MeasurableUpdates } from '../types';
import type { StarlogEntry } from '@/features/starlog/types';
import { getEntriesByGoalId } from '@/features/starlog/services/starlog-service';
import supabase from '@/lib/db/client';

export function useGoalDetail(goalId: string): {
  goal: GoalWithMeasurables | null;
  activityEntries: ActivityEntry[];
  starlogEntries: StarlogEntry[];
  isLoading: boolean;
  isStarlogLoading: boolean;
  onSaveMeasurable: (measurableId: string, updates: MeasurableUpdates) => Promise<void>;
  onDeleteMeasurable: (measurableId: string) => Promise<void>;
  onAddMeasurable: (input: MeasurableInput) => Promise<void>;
  measurableError: string | null;
  clearMeasurableError: () => void;
} {
  const { goals, isLoading, setGoals, setIsLoading, upsertMeasurable, removeMeasurable } =
    useGoalStore();
  const [starlogEntries, setStarlogEntries] = useState<StarlogEntry[]>([]);
  const [isStarlogLoading, setIsStarlogLoading] = useState(false);
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
      setStarlogEntries([]);
      setIsStarlogLoading(false);
      return;
    }

    let isActive = true;

    async function loadStarlogEntries() {
      setIsStarlogLoading(true);
      const data = await getEntriesByGoalId(goalId);
      if (isActive) {
        setStarlogEntries(data);
        setIsStarlogLoading(false);
      }
    }

    loadStarlogEntries();

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
    starlogEntries,
    isLoading,
    isStarlogLoading,
    onSaveMeasurable,
    onDeleteMeasurable,
    onAddMeasurable,
    measurableError,
    clearMeasurableError,
  };
}
