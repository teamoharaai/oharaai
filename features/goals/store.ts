import { create } from 'zustand';
import { deleteGoal as deleteGoalRecord } from './services/goal-service';
import type { GoalWithMeasurables, Measurable } from './types';

interface GoalStore {
  goals: GoalWithMeasurables[];
  selectedGoalId: string | null;
  isLoading: boolean;
  setGoals: (goals: GoalWithMeasurables[]) => void;
  upsertGoal: (goal: GoalWithMeasurables) => void;
  setSelectedGoalId: (id: string | null) => void;
  setIsLoading: (loading: boolean) => void;
  deleteGoal: (id: string) => Promise<void>;
  updateMeasurableValue: (measurableId: string, value: number) => void;
  upsertMeasurable: (goalId: string, measurable: Measurable) => void;
  removeMeasurable: (goalId: string, measurableId: string) => void;
}

export const useGoalStore = create<GoalStore>((set) => ({
  goals: [],
  selectedGoalId: null,
  isLoading: false,
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
  updateMeasurableValue: (measurableId, value) =>
    set((state) => ({
      goals: state.goals.map((goal) => ({
        ...goal,
        measurables: goal.measurables.map((m) =>
          m.id === measurableId ? { ...m, currentValue: value } : m
        ),
      })),
    })),
  upsertMeasurable: (goalId, measurable) =>
    set((state) => ({
      goals: state.goals.map((goal) => {
        if (goal.id !== goalId) return goal;
        const exists = goal.measurables.some((m) => m.id === measurable.id);
        const measurables = exists
          ? goal.measurables.map((m) => (m.id === measurable.id ? measurable : m))
          : [...goal.measurables, measurable].sort((a, b) => a.sortOrder - b.sortOrder);
        return { ...goal, measurables };
      }),
    })),
  removeMeasurable: (goalId, measurableId) =>
    set((state) => ({
      goals: state.goals.map((goal) => {
        if (goal.id !== goalId) return goal;
        return { ...goal, measurables: goal.measurables.filter((m) => m.id !== measurableId) };
      }),
    })),
}));
