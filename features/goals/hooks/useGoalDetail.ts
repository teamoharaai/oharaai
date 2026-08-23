import { useCallback, useEffect, useState } from 'react';
import { authedFetch, UnauthorizedError } from '@/lib/api/client';
import { refreshMomentumAfterMeaningfulMutation } from '@/features/momentum/hooks/useMomentumHomeSummary';
import supabase from '@/lib/db/client';
import {
  completeMilestone,
  createMilestone,
  createTracker,
  deleteMilestone,
  deleteTracker,
  fetchGoalById,
  fetchGoals,
  updateGoal,
  updateMilestone,
  updateTracker,
} from '../services/goal-service';
import { useGoalStore } from '../store';
import type {
  GoalMilestoneInput,
  GoalMilestoneUpdates,
  GoalWithDetails,
  TrackerInput,
  TrackerUpdates,
} from '../types';

type EditableMilestoneUpdates = Omit<GoalMilestoneUpdates, 'completedAt'>;

export interface UseGoalDetailResult {
  goal: GoalWithDetails | null;
  isLoading: boolean;
  onSaveTracker: (trackerId: string, updates: TrackerUpdates) => Promise<void>;
  onDeleteTracker: (trackerId: string) => Promise<void>;
  onAddTracker: (input: TrackerInput) => Promise<void>;
  onCompleteTracker: (trackerId: string) => Promise<void>;
  onSaveMilestone: (milestoneId: string, updates: EditableMilestoneUpdates) => Promise<void>;
  onDeleteMilestone: (milestoneId: string) => Promise<void>;
  onAddMilestone: (input: GoalMilestoneInput) => Promise<void>;
  onCompleteMilestone: (milestoneId: string) => Promise<void>;
  onUpdateDeadline: (deadline: Date | null) => Promise<boolean>;
  onUpdateProject: (projectId: string | null) => Promise<boolean>;
  onUpdateDescription: (description: string | null) => Promise<boolean>;
  onCompleteGoal: () => Promise<boolean>;
  onArchiveGoal: () => Promise<boolean>;
  completedTrackerIds: Set<string>;
  completingMilestoneIds: Set<string>;
  trackerError: string | null;
  milestoneError: string | null;
  goalError: string | null;
  clearTrackerError: () => void;
  clearMilestoneError: () => void;
  clearGoalError: () => void;
}

function mergeServerGoal(current: GoalWithDetails, saved: GoalWithDetails): GoalWithDetails {
  return {
    ...saved,
    has_successor: current.has_successor,
    successor: current.successor,
    vaultItemCount: current.vaultItemCount,
    echoLinkCount: current.echoLinkCount,
    latestBrtTags: current.latestBrtTags,
  };
}

export function useGoalDetail(goalId: string): UseGoalDetailResult {
  const {
    goals,
    isLoading,
    setGoals,
    setIsLoading,
    upsertGoal,
    upsertTracker,
    removeTracker,
    upsertMilestone,
    removeMilestone,
  } = useGoalStore();
  const [trackerError, setTrackerError] = useState<string | null>(null);
  const [milestoneError, setMilestoneError] = useState<string | null>(null);
  const [goalError, setGoalError] = useState<string | null>(null);
  const [completedTrackerIds, setCompletedTrackerIds] = useState<Set<string>>(new Set());
  const [completingMilestoneIds, setCompletingMilestoneIds] = useState<Set<string>>(new Set());
  const goal = goals.find((item) => item.id === goalId) ?? null;

  useEffect(() => {
    setCompletedTrackerIds(new Set());
    setCompletingMilestoneIds(new Set());
    setTrackerError(null);
    setMilestoneError(null);
    setGoalError(null);
  }, [goalId]);

  useEffect(() => {
    if (!goalId || isLoading) return;
    if (goal && (!goal.has_successor || goal.successor !== null)) return;

    async function load() {
      setIsLoading(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        if (goals.length === 0) {
          const list = await fetchGoals(user.id);
          const listedGoal = list.find((item) => item.id === goalId);
          const detail = listedGoal ?? await fetchGoalById(goalId);
          setGoals(detail
            ? [detail, ...list.filter((item) => item.id !== detail.id)]
            : list);
          return;
        }

        const detail = await fetchGoalById(goalId);
        if (detail) {
          setGoals([detail, ...goals.filter((item) => item.id !== detail.id)]);
        }
      } finally {
        setIsLoading(false);
      }
    }

    void load();
  }, [goal, goalId, goals, isLoading, setGoals, setIsLoading]);

  const readOnlyGoal = useCallback(() => {
    const current = goals.find((item) => item.id === goalId);
    if (!current?.has_successor) return current ?? null;
    setGoalError('This goal has a continuation and is read-only.');
    return null;
  }, [goalId, goals]);

  const clearTrackerError = useCallback(() => setTrackerError(null), []);
  const clearMilestoneError = useCallback(() => setMilestoneError(null), []);
  const clearGoalError = useCallback(() => setGoalError(null), []);

  const onSaveTracker = useCallback(async (trackerId: string, updates: TrackerUpdates) => {
    const currentGoal = readOnlyGoal();
    const current = currentGoal?.trackers.find((item) => item.id === trackerId);
    if (!current) return;

    upsertTracker(goalId, { ...current, ...updates });
    const saved = await updateTracker(goalId, trackerId, updates);
    if (!saved) {
      upsertTracker(goalId, current);
      setTrackerError('Failed to save tracker changes. Please try again.');
      return;
    }
    upsertTracker(goalId, saved);
  }, [goalId, readOnlyGoal, upsertTracker]);

  const onDeleteTracker = useCallback(async (trackerId: string) => {
    const currentGoal = readOnlyGoal();
    const current = currentGoal?.trackers.find((item) => item.id === trackerId);
    if (!current) return;

    removeTracker(goalId, trackerId);
    if (!await deleteTracker(goalId, trackerId)) {
      upsertTracker(goalId, current);
      setTrackerError('Failed to delete tracker. Please try again.');
    }
  }, [goalId, readOnlyGoal, removeTracker, upsertTracker]);

  const onAddTracker = useCallback(async (input: TrackerInput) => {
    const currentGoal = readOnlyGoal();
    if (!currentGoal) return;

    const saved = await createTracker(goalId, {
      ...input,
      sortOrder: currentGoal.trackers.length,
    });
    if (!saved) {
      setTrackerError('Failed to add tracker. Please try again.');
      return;
    }
    upsertTracker(goalId, saved);
  }, [goalId, readOnlyGoal, upsertTracker]);

  const onCompleteTracker = useCallback(async (trackerId: string) => {
    const currentGoal = readOnlyGoal();
    const tracker = currentGoal?.trackers.find((item) => item.id === trackerId);
    if (!currentGoal || !tracker || completedTrackerIds.has(trackerId)) return;

    setTrackerError(null);
    setCompletedTrackerIds((previous) => new Set(previous).add(trackerId));

    try {
      const response = await authedFetch('/api/goals/complete-tracker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackerId, goalId }),
      });
      const payload = (await response.json()) as { success?: boolean; error?: string };
      if (!response.ok || payload.success !== true) {
        throw new Error(payload.error ?? 'Failed to complete tracker');
      }

      if (tracker.type === 'checklist') {
        upsertTracker(goalId, { ...tracker, currentValue: 1 });
      }
      void refreshMomentumAfterMeaningfulMutation();
    } catch (error) {
      setCompletedTrackerIds((previous) => {
        const next = new Set(previous);
        next.delete(trackerId);
        return next;
      });
      setTrackerError(
        error instanceof UnauthorizedError
          ? 'You need to be signed in to update a tracker.'
          : error instanceof Error
            ? error.message
            : 'Failed to complete tracker',
      );
    }
  }, [completedTrackerIds, goalId, readOnlyGoal, upsertTracker]);

  const onSaveMilestone = useCallback(async (
    milestoneId: string,
    updates: EditableMilestoneUpdates,
  ) => {
    const currentGoal = readOnlyGoal();
    const current = currentGoal?.milestones.find((item) => item.id === milestoneId);
    if (!current || current.completedAt) return;

    upsertMilestone(goalId, { ...current, ...updates });
    const saved = await updateMilestone(goalId, milestoneId, updates);
    if (!saved) {
      upsertMilestone(goalId, current);
      setMilestoneError('Failed to save milestone changes. Please try again.');
      return;
    }
    upsertMilestone(goalId, saved);
    void refreshMomentumAfterMeaningfulMutation();
  }, [goalId, readOnlyGoal, upsertMilestone]);

  const onDeleteMilestone = useCallback(async (milestoneId: string) => {
    const currentGoal = readOnlyGoal();
    const current = currentGoal?.milestones.find((item) => item.id === milestoneId);
    if (!current) return;

    removeMilestone(goalId, milestoneId);
    if (!await deleteMilestone(goalId, milestoneId)) {
      upsertMilestone(goalId, current);
      setMilestoneError('Failed to delete milestone. Please try again.');
    }
  }, [goalId, readOnlyGoal, removeMilestone, upsertMilestone]);

  const onAddMilestone = useCallback(async (input: GoalMilestoneInput) => {
    const currentGoal = readOnlyGoal();
    if (!currentGoal) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setMilestoneError('You need to be signed in to add a milestone.');
      return;
    }

    const saved = await createMilestone(goalId, user.id, {
      ...input,
      sortOrder: currentGoal.milestones.length,
    });
    if (!saved) {
      setMilestoneError('Failed to add milestone. Please try again.');
      return;
    }
    upsertMilestone(goalId, saved);
    void refreshMomentumAfterMeaningfulMutation();
  }, [goalId, readOnlyGoal, upsertMilestone]);

  const onCompleteMilestone = useCallback(async (milestoneId: string) => {
    const currentGoal = readOnlyGoal();
    const milestone = currentGoal?.milestones.find((item) => item.id === milestoneId);
    if (!milestone || milestone.completedAt || completingMilestoneIds.has(milestoneId)) return;

    setMilestoneError(null);
    setCompletingMilestoneIds((previous) => new Set(previous).add(milestoneId));
    const optimistic = { ...milestone, completedAt: new Date() };
    upsertMilestone(goalId, optimistic);

    const saved = await completeMilestone(goalId, milestoneId);
    setCompletingMilestoneIds((previous) => {
      const next = new Set(previous);
      next.delete(milestoneId);
      return next;
    });
    if (!saved) {
      upsertMilestone(goalId, milestone);
      setMilestoneError('Failed to complete milestone. Please try again.');
      return;
    }
    upsertMilestone(goalId, saved);
    void refreshMomentumAfterMeaningfulMutation();
  }, [completingMilestoneIds, goalId, readOnlyGoal, upsertMilestone]);

  const persistGoalUpdate = useCallback(async (
    optimistic: GoalWithDetails,
    updates: Parameters<typeof updateGoal>[1],
  ): Promise<boolean> => {
    const current = readOnlyGoal();
    if (!current) return false;

    setGoalError(null);
    upsertGoal(optimistic);
    const saved = await updateGoal(goalId, updates);
    if (!saved) {
      upsertGoal(current);
      setGoalError('Failed to update goal. Please try again.');
      return false;
    }
    upsertGoal(mergeServerGoal(current, saved));
    if (updates.progress !== undefined || updates.status !== undefined || updates.deadline !== undefined) {
      void refreshMomentumAfterMeaningfulMutation();
    }
    return true;
  }, [goalId, readOnlyGoal, upsertGoal]);

  const onUpdateDeadline = useCallback(async (deadline: Date | null) => {
    const current = readOnlyGoal();
    if (!current) return false;
    return persistGoalUpdate({ ...current, deadline }, { deadline });
  }, [persistGoalUpdate, readOnlyGoal]);

  const onUpdateProject = useCallback(async (projectId: string | null) => {
    const current = readOnlyGoal();
    if (!current) return false;
    if (current.projectId === projectId) return true;
    return persistGoalUpdate({ ...current, projectId }, { projectId });
  }, [persistGoalUpdate, readOnlyGoal]);

  const onUpdateDescription = useCallback(async (description: string | null) => {
    const current = readOnlyGoal();
    if (!current) return false;
    if (current.description === description) return true;
    return persistGoalUpdate({ ...current, description }, { description });
  }, [persistGoalUpdate, readOnlyGoal]);

  const onCompleteGoal = useCallback(async () => {
    const current = readOnlyGoal();
    if (!current) return false;
    if (current.status === 'complete') return true;
    return persistGoalUpdate(
      { ...current, status: 'complete', progress: 100 },
      { status: 'complete', progress: 100 },
    );
  }, [persistGoalUpdate, readOnlyGoal]);

  const onArchiveGoal = useCallback(async () => {
    const current = readOnlyGoal();
    if (!current) return false;
    if (current.status === 'archived') return true;
    return persistGoalUpdate({ ...current, status: 'archived' }, { status: 'archived' });
  }, [persistGoalUpdate, readOnlyGoal]);

  return {
    goal,
    isLoading,
    onSaveTracker,
    onDeleteTracker,
    onAddTracker,
    onCompleteTracker,
    onSaveMilestone,
    onDeleteMilestone,
    onAddMilestone,
    onCompleteMilestone,
    onUpdateDeadline,
    onUpdateProject,
    onUpdateDescription,
    onCompleteGoal,
    onArchiveGoal,
    completedTrackerIds,
    completingMilestoneIds,
    trackerError,
    milestoneError,
    goalError,
    clearTrackerError,
    clearMilestoneError,
    clearGoalError,
  };
}
