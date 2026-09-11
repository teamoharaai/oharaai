import { useCallback, useEffect, useRef, useState } from 'react';
import { authedFetch, UnauthorizedError } from '@/lib/api/client';
import { refreshMomentumAfterMeaningfulMutation } from '@/features/momentum/hooks/useMomentumHomeSummary';
import supabase from '@/lib/db/client';
import {
  completeMilestone,
  createMilestone,
  createTracker,
  deleteMilestone,
  deleteTracker,
  fetchGoals,
  fetchHydratedGoalDetail,
  periodStateFromDto,
  updateGoal,
  updateMilestone,
  updateTracker,
} from '../services/goal-service';
import type { TrackerPeriodStateDto } from '@/lib/db/tracker-mutations';
import { useGoalStore } from '../store';
import {
  applyOptimisticComplete,
  applyOptimisticCounter,
  applyOptimisticUncomplete,
  beginMutation,
  completionValueForTracker,
  createMutationRegistry,
  endMutation,
  isLatestMutation,
  resetRegistry,
} from '../tracker-optimism';
import { useTrackerBoundaryRefresh } from './useTrackerBoundaryRefresh';
import type {
  GoalMilestoneInput,
  GoalMilestoneUpdates,
  GoalWithDetails,
  Tracker,
  TrackerInput,
  TrackerUpdates,
} from '../types';

type EditableMilestoneUpdates = Omit<GoalMilestoneUpdates, 'completedAt'>;

// Stable empty reference so the boundary hook's memo doesn't churn when no goal
// is selected.
const EMPTY_TRACKERS: Tracker[] = [];

export interface UseGoalDetailResult {
  goal: GoalWithDetails | null;
  isLoading: boolean;
  onSaveTracker: (trackerId: string, updates: TrackerUpdates) => Promise<void>;
  onDeleteTracker: (trackerId: string) => Promise<void>;
  onAddTracker: (input: TrackerInput) => Promise<void>;
  onCompleteTracker: (trackerId: string) => Promise<void>;
  onUncompleteTracker: (trackerId: string) => Promise<void>;
  onLogCounter: (trackerId: string) => Promise<void>;
  onSaveMilestone: (milestoneId: string, updates: EditableMilestoneUpdates) => Promise<void>;
  onDeleteMilestone: (milestoneId: string) => Promise<void>;
  onAddMilestone: (input: GoalMilestoneInput) => Promise<void>;
  onCompleteMilestone: (milestoneId: string) => Promise<void>;
  onUpdateDeadline: (deadline: Date | null) => Promise<boolean>;
  onUpdateProject: (projectId: string | null) => Promise<boolean>;
  onUpdateDescription: (description: string | null) => Promise<boolean>;
  onCompleteGoal: () => Promise<boolean>;
  onArchiveGoal: () => Promise<boolean>;
  completingMilestoneIds: Set<string>;
  trackerError: string | null;
  milestoneError: string | null;
  goalError: string | null;
  clearTrackerError: () => void;
  clearMilestoneError: () => void;
  clearGoalError: () => void;
}

function trackerMutationErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof UnauthorizedError) return 'You need to be signed in to update a tracker.';
  if (error instanceof Error) return error.message;
  return fallback;
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
    patchTracker,
    removeTracker,
    upsertMilestone,
    removeMilestone,
  } = useGoalStore();
  const [trackerError, setTrackerError] = useState<string | null>(null);
  const [milestoneError, setMilestoneError] = useState<string | null>(null);
  const [goalError, setGoalError] = useState<string | null>(null);
  const [completingMilestoneIds, setCompletingMilestoneIds] = useState<Set<string>>(new Set());
  // Per-tracker in-flight + ordering registry (Task 6). A ref, not state: the
  // card manages its own busy affordance, and these guards must be read/updated
  // synchronously across overlapping mutations without triggering re-renders.
  const mutationRegistry = useRef(createMutationRegistry());
  // Which goalId has had its trackers period-hydrated. A goal present in the
  // list is NOT treated as already-hydrated: opening detail always runs the
  // hydrated read path for the selected goal (and only that goal).
  const [hydratedGoalId, setHydratedGoalId] = useState<string | null>(null);
  const goal = goals.find((item) => item.id === goalId) ?? null;

  useEffect(() => {
    setCompletingMilestoneIds(new Set());
    resetRegistry(mutationRegistry.current);
    setHydratedGoalId(null);
    setTrackerError(null);
    setMilestoneError(null);
    setGoalError(null);
  }, [goalId]);

  useEffect(() => {
    if (!goalId || hydratedGoalId === goalId) return;

    let cancelled = false;
    async function load() {
      setIsLoading(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        // One asOf drives every tracker's derivation for this open.
        const asOf = new Date();
        const baseGoals = goals.length === 0 ? await fetchGoals(user.id) : goals;
        const { goal: detail, error } = await fetchHydratedGoalDetail(goalId, user.id, asOf);
        if (cancelled) return;

        if (error) setTrackerError(error);
        if (detail) {
          setGoals([detail, ...baseGoals.filter((item) => item.id !== detail.id)]);
          setHydratedGoalId(goalId);
        } else if (goals.length === 0) {
          setGoals(baseGoals);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [goalId, hydratedGoalId, goals, setGoals, setIsLoading]);

  const readOnlyGoal = useCallback(() => {
    const current = goals.find((item) => item.id === goalId);
    if (!current?.has_successor) return current ?? null;
    setGoalError('This goal has a continuation and is read-only.');
    return null;
  }, [goalId, goals]);

  const clearTrackerError = useCallback(() => setTrackerError(null), []);
  const clearMilestoneError = useCallback(() => setMilestoneError(null), []);
  const clearGoalError = useCallback(() => setGoalError(null), []);

  // Silent re-hydration of the selected goal's tracker period state. Used by the
  // cadence-boundary refresh and after a frequency/target edit invalidates the
  // old derivation. Reads the store via getState() (not the `goals` closure) so
  // the callback stays stable — the boundary timer must not reset every render.
  const refreshDetail = useCallback(async () => {
    if (!goalId) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { goal: detail, error } = await fetchHydratedGoalDetail(goalId, user.id, new Date());
    if (error) setTrackerError(error);
    if (!detail) return;

    const current = useGoalStore.getState().goals.find((item) => item.id === goalId);
    upsertGoal(current ? mergeServerGoal(current, detail) : detail);
  }, [goalId, upsertGoal]);

  const onSaveTracker = useCallback(async (trackerId: string, updates: TrackerUpdates) => {
    const currentGoal = readOnlyGoal();
    const current = currentGoal?.trackers.find((item) => item.id === trackerId);
    if (!current) return;

    // A frequency or target change invalidates the derived period state (its
    // bounds / completion threshold no longer hold) — rederive rather than keep
    // the stale one. Metadata-only edits (title, unit) preserve periodState.
    const invalidatesPeriod =
      ('frequency' in updates && updates.frequency !== current.frequency) ||
      ('targetValue' in updates && updates.targetValue !== current.targetValue);

    // Merge only the changed metadata fields — never replace the whole tracker
    // (which would drop the live periodState via mapTracker's null default).
    patchTracker(goalId, trackerId, updates as Partial<Tracker>);
    const saved = await updateTracker(goalId, trackerId, updates);
    if (!saved) {
      patchTracker(goalId, trackerId, {
        title: current.title,
        targetValue: current.targetValue,
        targetUnit: current.targetUnit,
        frequency: current.frequency,
        sortOrder: current.sortOrder,
      });
      setTrackerError('Failed to save tracker changes. Please try again.');
      return;
    }
    // Apply the server-normalized metadata but keep the live periodState
    // (`saved.periodState` is always null from a metadata update).
    patchTracker(goalId, trackerId, {
      title: saved.title,
      type: saved.type,
      targetValue: saved.targetValue,
      targetUnit: saved.targetUnit,
      frequency: saved.frequency,
      currentValue: saved.currentValue,
      isAiSuggested: saved.isAiSuggested,
      sortOrder: saved.sortOrder,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
    });
    if (invalidatesPeriod) {
      // Drop the now-invalid derivation and rederive under the new bounds/target
      // rather than briefly presenting a stale completion verdict.
      patchTracker(goalId, trackerId, { periodState: null });
      void refreshDetail();
    }
  }, [goalId, readOnlyGoal, patchTracker, refreshDetail]);

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

  // Checklist/habit completion. Goes through the shared authenticated
  // /api/trackers/log route (action 'complete'), optimistically flips the
  // current period to completed, then reconciles from the returned periodState.
  // The in-flight guard makes rapid double-taps one logical completion; the
  // ordering guard ensures a superseding mutation's response always wins.
  const onCompleteTracker = useCallback(async (trackerId: string) => {
    const currentGoal = readOnlyGoal();
    const tracker = currentGoal?.trackers.find((item) => item.id === trackerId);
    if (!currentGoal || !tracker) return;
    // Counters progress by logging their value (+1), not one-tap complete.
    if (tracker.type === 'counter') return;
    // Idempotent: already completed this period → nothing to do.
    if (tracker.periodState?.isCompleted) return;

    const seq = beginMutation(mutationRegistry.current, trackerId, 'complete');
    if (seq === null) return; // an identical complete is already in flight

    const previousPeriodState = tracker.periodState;
    setTrackerError(null);
    const optimistic = applyOptimisticComplete(
      previousPeriodState,
      completionValueForTracker(tracker.type, tracker.targetValue),
    );
    if (optimistic !== previousPeriodState) {
      patchTracker(goalId, trackerId, { periodState: optimistic });
    }

    try {
      const response = await authedFetch('/api/trackers/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackerId, goalId, action: 'complete' }),
      });
      const payload = (await response.json()) as {
        success?: boolean;
        periodState?: TrackerPeriodStateDto | null;
        error?: string;
      };
      if (!response.ok || payload.success !== true) {
        throw new Error(payload.error ?? 'Failed to complete tracker');
      }
      if (isLatestMutation(mutationRegistry.current, trackerId, seq)) {
        patchTracker(goalId, trackerId, {
          periodState: periodStateFromDto(payload.periodState ?? null),
        });
        void refreshMomentumAfterMeaningfulMutation();
      }
    } catch (error) {
      if (isLatestMutation(mutationRegistry.current, trackerId, seq)) {
        patchTracker(goalId, trackerId, { periodState: previousPeriodState });
        setTrackerError(trackerMutationErrorMessage(error, 'Failed to complete tracker'));
      }
    } finally {
      endMutation(mutationRegistry.current, trackerId, seq);
    }
  }, [goalId, readOnlyGoal, patchTracker]);

  // Habit/checklist uncomplete — deletes all current-period logs server-side.
  // Optimistically clears the current period, then reconciles. Counters have no
  // uncomplete gesture (rejected server-side); guarded here too.
  const onUncompleteTracker = useCallback(async (trackerId: string) => {
    const currentGoal = readOnlyGoal();
    const tracker = currentGoal?.trackers.find((item) => item.id === trackerId);
    if (!currentGoal || !tracker) return;
    if (tracker.type === 'counter') return;
    // Nothing to undo when the current period is already not completed.
    if (tracker.periodState && !tracker.periodState.isCompleted) return;

    const seq = beginMutation(mutationRegistry.current, trackerId, 'uncomplete');
    if (seq === null) return;

    const previousPeriodState = tracker.periodState;
    setTrackerError(null);
    const optimistic = applyOptimisticUncomplete(previousPeriodState);
    if (optimistic !== previousPeriodState) {
      patchTracker(goalId, trackerId, { periodState: optimistic });
    }

    try {
      const response = await authedFetch('/api/trackers/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackerId, goalId, action: 'uncomplete' }),
      });
      const payload = (await response.json()) as {
        success?: boolean;
        periodState?: TrackerPeriodStateDto | null;
        error?: string;
      };
      if (!response.ok || payload.success !== true) {
        throw new Error(payload.error ?? 'Failed to update tracker');
      }
      if (isLatestMutation(mutationRegistry.current, trackerId, seq)) {
        patchTracker(goalId, trackerId, {
          periodState: periodStateFromDto(payload.periodState ?? null),
        });
        void refreshMomentumAfterMeaningfulMutation();
      }
    } catch (error) {
      if (isLatestMutation(mutationRegistry.current, trackerId, seq)) {
        patchTracker(goalId, trackerId, { periodState: previousPeriodState });
        setTrackerError(trackerMutationErrorMessage(error, 'Failed to update tracker'));
      }
    } finally {
      endMutation(mutationRegistry.current, trackerId, seq);
    }
  }, [goalId, readOnlyGoal, patchTracker]);

  // Counter +1: optimistic current-bucket bump, then reconcile from periodState.
  // (Card display still reads the legacy scalar until Task 8, so the visible
  // number moves only after that; periodState is authoritative in the store.)
  const onLogCounter = useCallback(async (trackerId: string) => {
    const currentGoal = readOnlyGoal();
    const tracker = currentGoal?.trackers.find((item) => item.id === trackerId);
    if (!currentGoal || !tracker) return;

    const seq = beginMutation(mutationRegistry.current, trackerId, 'counter-log');
    if (seq === null) return;

    const previousPeriodState = tracker.periodState;
    setTrackerError(null);
    const optimistic = applyOptimisticCounter(previousPeriodState, 1, tracker.targetValue);
    if (optimistic !== previousPeriodState) {
      patchTracker(goalId, trackerId, { periodState: optimistic });
    }

    try {
      const response = await authedFetch('/api/trackers/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackerId, goalId, action: 'counter-log' }),
      });
      const payload = (await response.json()) as {
        success?: boolean;
        periodState?: TrackerPeriodStateDto | null;
        error?: string;
      };
      if (!response.ok || payload.success !== true) {
        throw new Error(payload.error ?? 'Failed to log progress');
      }
      if (isLatestMutation(mutationRegistry.current, trackerId, seq)) {
        patchTracker(goalId, trackerId, {
          periodState: periodStateFromDto(payload.periodState ?? null),
        });
        void refreshMomentumAfterMeaningfulMutation();
      }
    } catch (error) {
      if (isLatestMutation(mutationRegistry.current, trackerId, seq)) {
        patchTracker(goalId, trackerId, { periodState: previousPeriodState });
        setTrackerError(trackerMutationErrorMessage(error, 'Failed to log progress'));
      }
    } finally {
      endMutation(mutationRegistry.current, trackerId, seq);
    }
  }, [goalId, readOnlyGoal, patchTracker]);

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

  // Cadence-boundary refresh: re-hydrate at the earliest configured
  // periodState.endExclusive and on RN foreground / web visibility+focus.
  useTrackerBoundaryRefresh(goal?.trackers ?? EMPTY_TRACKERS, refreshDetail);

  return {
    goal,
    isLoading,
    onSaveTracker,
    onDeleteTracker,
    onAddTracker,
    onCompleteTracker,
    onUncompleteTracker,
    onLogCounter,
    onSaveMilestone,
    onDeleteMilestone,
    onAddMilestone,
    onCompleteMilestone,
    onUpdateDeadline,
    onUpdateProject,
    onUpdateDescription,
    onCompleteGoal,
    onArchiveGoal,
    completingMilestoneIds,
    trackerError,
    milestoneError,
    goalError,
    clearTrackerError,
    clearMilestoneError,
    clearGoalError,
  };
}
