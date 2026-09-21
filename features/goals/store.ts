import { create } from 'zustand';
import { deleteGoal as deleteGoalRecord } from './services/goal-service';
import { assignNotesToFolder, clearFolderFromNotes } from './sticky-notes-folders';
import type { GoalMilestone, GoalNote, GoalNoteFolder, GoalWithDetails, Tracker } from './types';

interface GoalStore {
  goals: GoalWithDetails[];
  selectedGoalId: string | null;
  recentGoalVisits: Record<string, number>;
  isLoading: boolean;
  setGoals: (goals: GoalWithDetails[]) => void;
  upsertGoal: (goal: GoalWithDetails) => void;
  setSelectedGoalId: (id: string | null) => void;
  setIsLoading: (loading: boolean) => void;
  deleteGoal: (id: string) => Promise<void>;
  updateTrackerValue: (trackerId: string, value: number) => void;
  upsertTracker: (goalId: string, tracker: Tracker) => void;
  removeTracker: (goalId: string, trackerId: string) => void;
  upsertMilestone: (goalId: string, milestone: GoalMilestone) => void;
  removeMilestone: (goalId: string, milestoneId: string) => void;
  upsertNote: (goalId: string, note: GoalNote) => void;
  removeNote: (goalId: string, noteId: string) => void;
  setGoalNotes: (goalId: string, notes: GoalNote[]) => void;
  setGoalNoteFolders: (goalId: string, folders: GoalNoteFolder[]) => void;
  upsertNoteFolder: (goalId: string, folder: GoalNoteFolder) => void;
  removeNoteFolder: (goalId: string, folderId: string) => void;
  setNotesFolder: (goalId: string, noteIds: readonly string[], folderId: string | null) => void;
}

export const useGoalStore = create<GoalStore>((set) => ({
  goals: [],
  selectedGoalId: null,
  recentGoalVisits: {},
  isLoading: true,
  setGoals: (goals) => set({ goals }),
  upsertGoal: (goal) =>
    set((state) => {
      const existingIndex = state.goals.findIndex((item) => item.id === goal.id);
      if (existingIndex === -1) {
        return { goals: [goal, ...state.goals] };
      }

      const goals = [...state.goals];
      goals[existingIndex] = goal;
      return { goals };
    }),
  setSelectedGoalId: (id) => set((state) => ({
    selectedGoalId: id,
    recentGoalVisits: id ? { ...state.recentGoalVisits, [id]: Date.now() } : state.recentGoalVisits,
  })),
  setIsLoading: (loading) => set({ isLoading: loading }),
  deleteGoal: async (id) => {
    await deleteGoalRecord(id);
    set((state) => ({
      goals: state.goals.filter((goal) => goal.id !== id),
    }));
  },
  updateTrackerValue: (trackerId, value) =>
    set((state) => ({
      goals: state.goals.map((goal) => ({
        ...goal,
        trackers: goal.trackers.map((tracker) =>
          tracker.id === trackerId ? { ...tracker, currentValue: value } : tracker
        ),
      })),
    })),
  upsertTracker: (goalId, tracker) =>
    set((state) => ({
      goals: state.goals.map((goal) => {
        if (goal.id !== goalId) return goal;
        const exists = goal.trackers.some((item) => item.id === tracker.id);
        const trackers = exists
          ? goal.trackers.map((item) => (item.id === tracker.id ? tracker : item))
          : [...goal.trackers, tracker].sort((a, b) => a.sortOrder - b.sortOrder);
        return { ...goal, trackers };
      }),
    })),
  removeTracker: (goalId, trackerId) =>
    set((state) => ({
      goals: state.goals.map((goal) => {
        if (goal.id !== goalId) return goal;
        return { ...goal, trackers: goal.trackers.filter((tracker) => tracker.id !== trackerId) };
      }),
    })),
  upsertMilestone: (goalId, milestone) =>
    set((state) => ({
      goals: state.goals.map((goal) => {
        if (goal.id !== goalId) return goal;
        const exists = goal.milestones.some((item) => item.id === milestone.id);
        const milestones = exists
          ? goal.milestones.map((item) => (item.id === milestone.id ? milestone : item))
          : [...goal.milestones, milestone].sort((a, b) => a.sortOrder - b.sortOrder);
        return { ...goal, milestones };
      }),
    })),
  removeMilestone: (goalId, milestoneId) =>
    set((state) => ({
      goals: state.goals.map((goal) => {
        if (goal.id !== goalId) return goal;
        return {
          ...goal,
          milestones: goal.milestones.filter((milestone) => milestone.id !== milestoneId),
        };
      }),
    })),
  upsertNote: (goalId, note) =>
    set((state) => ({
      goals: state.goals.map((goal) => {
        if (goal.id !== goalId) return goal;
        const exists = goal.notes.some((item) => item.id === note.id);
        const notes = (exists
          ? goal.notes.map((item) => (item.id === note.id ? note : item))
          : [note, ...goal.notes]
        ).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        return { ...goal, notes };
      }),
    })),
  removeNote: (goalId, noteId) =>
    set((state) => ({
      goals: state.goals.map((goal) => {
        if (goal.id !== goalId) return goal;
        return { ...goal, notes: goal.notes.filter((note) => note.id !== noteId) };
      }),
    })),
  // Notes are loaded on the goal-detail path (from the goal's Vault), not with
  // the goal list — this replaces the whole notes array once that fetch lands.
  setGoalNotes: (goalId, notes) =>
    set((state) => ({
      goals: state.goals.map((goal) => {
        if (goal.id !== goalId) return goal;
        const sorted = [...notes].sort(
          (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
        );
        return { ...goal, notes: sorted };
      }),
    })),
  // Folders load on the goal-detail path (from the goal's Vault) like notes.
  setGoalNoteFolders: (goalId, folders) =>
    set((state) => ({
      goals: state.goals.map((goal) => {
        if (goal.id !== goalId) return goal;
        const sorted = [...folders].sort(
          (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
        );
        return { ...goal, noteFolders: sorted };
      }),
    })),
  upsertNoteFolder: (goalId, folder) =>
    set((state) => ({
      goals: state.goals.map((goal) => {
        if (goal.id !== goalId) return goal;
        const exists = goal.noteFolders.some((item) => item.id === folder.id);
        const noteFolders = (exists
          ? goal.noteFolders.map((item) => (item.id === folder.id ? folder : item))
          : [...goal.noteFolders, folder]
        ).sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
        return { ...goal, noteFolders };
      }),
    })),
  // Removing a folder mirrors the FK ON DELETE SET NULL (migration 065): its
  // notes fall back to General (folderId -> null) in the client state too.
  removeNoteFolder: (goalId, folderId) =>
    set((state) => ({
      goals: state.goals.map((goal) => {
        if (goal.id !== goalId) return goal;
        return {
          ...goal,
          noteFolders: goal.noteFolders.filter((folder) => folder.id !== folderId),
          notes: clearFolderFromNotes(goal.notes, folderId),
        };
      }),
    })),
  setNotesFolder: (goalId, noteIds, folderId) =>
    set((state) => ({
      goals: state.goals.map((goal) =>
        goal.id !== goalId ? goal : { ...goal, notes: assignNotesToFolder(goal.notes, noteIds, folderId) },
      ),
    })),
}));
