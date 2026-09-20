import { useCallback, useEffect, useRef, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { authedFetch, UnauthorizedError } from '@/lib/api/client';
import { useAuthStore } from '@/features/auth/store';
import { refreshMomentumAfterMeaningfulMutation } from '@/features/momentum/hooks/useMomentumHomeSummary';
import {
  createSignedMilestonePhotoUrl,
  removeMilestonePhoto,
  uploadMilestonePhoto,
} from '../services/milestone-image-service';
import {
  createSignedGoalNotePhotoUrl,
  removeGoalNotePhoto,
  uploadGoalNotePhoto,
} from '../services/goal-note-image-service';
import {
  completeMilestone,
  createGoalNote,
  createMilestone,
  createTracker,
  deleteGoalNote,
  deleteMilestone,
  deleteTracker,
  extendGoalDeadline,
  fetchGoalById,
  fetchGoals,
  fetchGoalVaultNotes,
  updateGoal,
  updateGoalNote,
  updateMilestone,
  updateTracker,
} from '../services/goal-service';
import { useGoalStore } from '../store';
import type {
  GoalMilestoneInput,
  GoalMilestoneUpdates,
  GoalNoteInput,
  GoalNoteUpdates,
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
  onAttachMilestonePhoto: (milestoneId: string) => Promise<void>;
  resolveMilestonePhotoUrl: (storagePath: string) => Promise<string>;
  onAddNote: (input: GoalNoteInput) => Promise<void>;
  onSaveNote: (noteId: string, updates: GoalNoteUpdates) => Promise<void>;
  onDeleteNote: (noteId: string) => Promise<void>;
  onAttachNotePhoto: (noteId: string) => Promise<void>;
  resolveNotePhotoUrl: (storagePath: string) => Promise<string>;
  onUpdateDeadline: (deadline: Date | null) => Promise<boolean>;
  onUpdateProject: (projectId: string | null) => Promise<boolean>;
  onUpdateDescription: (description: string | null) => Promise<boolean>;
  onCompleteGoal: () => Promise<boolean>;
  onArchiveGoal: () => Promise<boolean>;
  completedTrackerIds: Set<string>;
  completingMilestoneIds: Set<string>;
  trackerError: string | null;
  milestoneError: string | null;
  noteError: string | null;
  goalError: string | null;
  clearTrackerError: () => void;
  clearMilestoneError: () => void;
  clearNoteError: () => void;
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
    // Notes load on a separate Vault fetch, not with the goal — carry any
    // already-loaded notes forward so a server reload doesn't blank them.
    notes: current.notes.length > 0 ? current.notes : saved.notes,
  };
}

// A goal fetched via GOAL_SELECT carries notes: [] (notes come from the Vault
// on the detail path). When a server fetch replaces a goal already in the
// store, preserve the notes we loaded so they don't flash away.
function withPreservedNotes(detail: GoalWithDetails): GoalWithDetails {
  const prev = useGoalStore.getState().goals.find((item) => item.id === detail.id);
  if (prev && prev.notes.length > 0) return { ...detail, notes: prev.notes };
  return detail;
}

export function useGoalDetail(goalId: string): UseGoalDetailResult {
  // Per-slice selectors instead of a bare useGoalStore(): this hook no longer
  // re-renders on every unrelated store write (isLoading toggles, selectedGoalId,
  // other goals' mutations), which is part of what let the hydration effect below
  // thrash into a React #185 "maximum update depth" loop.
  const goals = useGoalStore((state) => state.goals);
  const isLoading = useGoalStore((state) => state.isLoading);
  const setGoals = useGoalStore((state) => state.setGoals);
  const setIsLoading = useGoalStore((state) => state.setIsLoading);
  const upsertGoal = useGoalStore((state) => state.upsertGoal);
  const upsertTracker = useGoalStore((state) => state.upsertTracker);
  const removeTracker = useGoalStore((state) => state.removeTracker);
  const upsertMilestone = useGoalStore((state) => state.upsertMilestone);
  const removeMilestone = useGoalStore((state) => state.removeMilestone);
  const upsertNote = useGoalStore((state) => state.upsertNote);
  const removeNote = useGoalStore((state) => state.removeNote);
  const setGoalNotes = useGoalStore((state) => state.setGoalNotes);
  const [trackerError, setTrackerError] = useState<string | null>(null);
  const [milestoneError, setMilestoneError] = useState<string | null>(null);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [goalError, setGoalError] = useState<string | null>(null);
  const [completedTrackerIds, setCompletedTrackerIds] = useState<Set<string>>(new Set());
  const [completingMilestoneIds, setCompletingMilestoneIds] = useState<Set<string>>(new Set());
  const goal = goals.find((item) => item.id === goalId) ?? null;

  useEffect(() => {
    setCompletedTrackerIds(new Set());
    setCompletingMilestoneIds(new Set());
    setTrackerError(null);
    setMilestoneError(null);
    setNoteError(null);
    setGoalError(null);
  }, [goalId]);

  // We hydrate the full goal detail (which resolves the `successor` a list load
  // leaves null) when the goal is missing, or it advertises a successor we have
  // not loaded yet.
  const needsHydration = !goal || (goal.has_successor && goal.successor === null);
  // Tracks the goalId we have already fired a hydration fetch for. Because the
  // effect below no longer depends on the `goals` array, and this ref bounds it
  // to one fetch per goalId, `setGoals` replacing the array can never re-trigger
  // the fetch — closing the infinite-loop path that black-screened the workspace.
  const hydrationAttemptedForRef = useRef<string | null>(null);
  // Bounds the goal-notes Vault load to one fetch per goalId per mount, the
  // same way hydration is bounded, so store writes can't re-trigger it.
  const notesLoadedForRef = useRef<string | null>(null);

  useEffect(() => {
    if (!goalId || !needsHydration) return;
    if (hydrationAttemptedForRef.current === goalId) return;
    hydrationAttemptedForRef.current = goalId;

    const userId = useAuthStore.getState().session?.user.id ?? null;
    if (!userId) return;

    let cancelled = false;
    async function load() {
      setIsLoading(true);
      try {
        // Read the current list from the store at call time rather than closing
        // over a `goals` dependency, so array-identity churn can't re-run us.
        if (useGoalStore.getState().goals.length === 0) {
          const list = await fetchGoals(userId!);
          const listedGoal = list.find((item) => item.id === goalId);
          const detail = listedGoal ?? await fetchGoalById(goalId);
          if (!cancelled) {
            setGoals(detail
              ? [withPreservedNotes(detail), ...list.filter((item) => item.id !== detail.id)]
              : list);
          }
          return;
        }

        const detail = await fetchGoalById(goalId);
        if (detail && !cancelled) {
          const rest = useGoalStore.getState().goals.filter((item) => item.id !== detail.id);
          setGoals([withPreservedNotes(detail), ...rest]);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [goalId, needsHydration, setGoals, setIsLoading]);

  // Load the goal's notes from its Vault once the goal is present. Notes are no
  // longer embedded in the goal payload (they live in vault_items since
  // migration 061), so this is the detail-path fetch that populates goal.notes.
  const hasGoal = goal !== null;
  useEffect(() => {
    if (!goalId || !hasGoal) return;
    if (notesLoadedForRef.current === goalId) return;
    notesLoadedForRef.current = goalId;

    let cancelled = false;
    void (async () => {
      const notes = await fetchGoalVaultNotes(goalId);
      if (!cancelled) setGoalNotes(goalId, notes);
    })();
    return () => {
      cancelled = true;
    };
  }, [goalId, hasGoal, setGoalNotes]);

  const readOnlyGoal = useCallback(() => {
    const current = goals.find((item) => item.id === goalId);
    if (!current?.has_successor) return current ?? null;
    setGoalError('This goal has a continuation and is read-only.');
    return null;
  }, [goalId, goals]);

  const clearTrackerError = useCallback(() => setTrackerError(null), []);
  const clearMilestoneError = useCallback(() => setMilestoneError(null), []);
  const clearNoteError = useCallback(() => setNoteError(null), []);
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
    const userId = useAuthStore.getState().session?.user.id ?? null;
    if (!userId) {
      setMilestoneError('You need to be signed in to add a milestone.');
      return;
    }

    const saved = await createMilestone(goalId, userId, {
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

  // Photo evidence lives on the milestone card (the id already exists), which
  // also fits authoring a milestone ahead of time and adding the photo once the
  // achievement actually happens. Picking + upload are side effects, so they
  // live here; the panel receives this as a prop and stays free of services.
  const onAttachMilestonePhoto = useCallback(async (milestoneId: string) => {
    const currentGoal = readOnlyGoal();
    const current = currentGoal?.milestones.find((item) => item.id === milestoneId);
    if (!current) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setMilestoneError('Photo library permission is required to add a photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;

    setMilestoneError(null);
    try {
      const blob = await (await fetch(result.assets[0].uri)).blob();
      const { storagePath } = await uploadMilestonePhoto(milestoneId, blob);
      const saved = await updateMilestone(goalId, milestoneId, { photoUrl: storagePath });
      if (!saved) {
        setMilestoneError('Failed to save the photo. Please try again.');
        return;
      }
      if (current.photoUrl) void removeMilestonePhoto(current.photoUrl);
      upsertMilestone(goalId, saved);
    } catch {
      setMilestoneError('Failed to upload the photo. Please try again.');
    }
  }, [goalId, readOnlyGoal, upsertMilestone]);

  const onAddNote = useCallback(async (input: GoalNoteInput) => {
    const currentGoal = readOnlyGoal();
    if (!currentGoal) return;
    const userId = useAuthStore.getState().session?.user.id ?? null;
    if (!userId) {
      setNoteError('You need to be signed in to add a note.');
      return;
    }

    const saved = await createGoalNote(goalId, userId, input);
    if (!saved) {
      setNoteError('Failed to add note. Please try again.');
      return;
    }
    upsertNote(goalId, saved);
  }, [goalId, readOnlyGoal, upsertNote]);

  const onSaveNote = useCallback(async (noteId: string, updates: GoalNoteUpdates) => {
    const currentGoal = readOnlyGoal();
    const current = currentGoal?.notes.find((item) => item.id === noteId);
    if (!current) return;

    upsertNote(goalId, { ...current, ...updates });
    const saved = await updateGoalNote(goalId, noteId, updates);
    if (!saved) {
      upsertNote(goalId, current);
      setNoteError('Failed to save note changes. Please try again.');
      return;
    }
    upsertNote(goalId, saved);
  }, [goalId, readOnlyGoal, upsertNote]);

  const onDeleteNote = useCallback(async (noteId: string) => {
    const currentGoal = readOnlyGoal();
    const current = currentGoal?.notes.find((item) => item.id === noteId);
    if (!current) return;

    removeNote(goalId, noteId);
    if (!await deleteGoalNote(goalId, noteId)) {
      upsertNote(goalId, current);
      setNoteError('Failed to delete note. Please try again.');
    }
  }, [goalId, readOnlyGoal, removeNote, upsertNote]);

  // Photo evidence lives on the note card (the id already exists), mirroring the
  // milestone photo flow: picking + upload are side effects, so they live here;
  // the panel receives this as a prop and stays free of services.
  const onAttachNotePhoto = useCallback(async (noteId: string) => {
    const currentGoal = readOnlyGoal();
    const current = currentGoal?.notes.find((item) => item.id === noteId);
    if (!current) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setNoteError('Photo library permission is required to add a photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;

    setNoteError(null);
    try {
      const blob = await (await fetch(result.assets[0].uri)).blob();
      const { storagePath } = await uploadGoalNotePhoto(noteId, blob);
      const saved = await updateGoalNote(goalId, noteId, { photoUrl: storagePath });
      if (!saved) {
        setNoteError('Failed to save the photo. Please try again.');
        return;
      }
      if (current.photoUrl) void removeGoalNotePhoto(current.photoUrl);
      upsertNote(goalId, saved);
    } catch {
      setNoteError('Failed to upload the photo. Please try again.');
    }
  }, [goalId, readOnlyGoal, upsertNote]);

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
    if (!deadline) {
      if (current.status === 'expired') {
        setGoalError('Choose a future deadline to reactivate this expired Goal.');
        return false;
      }
      return persistGoalUpdate({ ...current, deadline: null }, { deadline: null });
    }
    setGoalError(null);
    try {
      const saved = await extendGoalDeadline(goalId, deadline);
      if (!saved) throw new Error('Goal could not be reloaded');
      upsertGoal(saved);
      void refreshMomentumAfterMeaningfulMutation();
      return true;
    } catch {
      setGoalError('Failed to extend the goal deadline. Please try again.');
      return false;
    }
  }, [goalId, persistGoalUpdate, readOnlyGoal, upsertGoal]);

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
      { ...current, status: 'complete', progress: 100, completedAt: new Date() },
      { status: 'complete', progress: 100 },
    );
  }, [persistGoalUpdate, readOnlyGoal]);

  const onArchiveGoal = useCallback(async () => {
    const current = readOnlyGoal();
    if (!current) return false;
    if (current.status === 'archived') return true;
    return persistGoalUpdate(
      { ...current, status: 'archived', archivedAt: new Date() },
      { status: 'archived' },
    );
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
    onAttachMilestonePhoto,
    resolveMilestonePhotoUrl: createSignedMilestonePhotoUrl,
    onAddNote,
    onSaveNote,
    onDeleteNote,
    onAttachNotePhoto,
    resolveNotePhotoUrl: createSignedGoalNotePhotoUrl,
    onUpdateDeadline,
    onUpdateProject,
    onUpdateDescription,
    onCompleteGoal,
    onArchiveGoal,
    completedTrackerIds,
    completingMilestoneIds,
    trackerError,
    milestoneError,
    noteError,
    goalError,
    clearTrackerError,
    clearMilestoneError,
    clearNoteError,
    clearGoalError,
  };
}
