import { create } from 'zustand';
import type { GoalWithMeasurables } from './types';

interface GoalStore {
  goals: GoalWithMeasurables[];
  selectedGoalId: string | null;
  isLoading: boolean;
  setGoals: (goals: GoalWithMeasurables[]) => void;
  upsertGoal: (goal: GoalWithMeasurables) => void;
  setSelectedGoalId: (id: string | null) => void;
  setIsLoading: (loading: boolean) => void;
  updateMeasurableValue: (measurableId: string, value: number) => void;
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
  updateMeasurableValue: (measurableId, value) =>
    set((state) => ({
      goals: state.goals.map((goal) => ({
        ...goal,
        measurables: goal.measurables.map((m) =>
          m.id === measurableId ? { ...m, currentValue: value } : m
        ),
      })),
    })),
}));
