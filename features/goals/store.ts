import { create } from 'zustand';
import { deleteGoal as deleteGoalRecord } from './services/goal-service';
import type { GoalMilestone, GoalWithDetails, Tracker } from './types';

interface GoalStore {
  goals: GoalWithDetails[];
  selectedGoalId: string | null;
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
}

export const useGoalStore = create<GoalStore>((set) => ({
  goals: [],
  selectedGoalId: null,
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
  setSelectedGoalId: (id) => set({ selectedGoalId: id }),
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
}));
