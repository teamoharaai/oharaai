import { create } from 'zustand';
import type { StarlogEntry } from './types';

interface StarlogStore {
  entries: StarlogEntry[];
  isLoading: boolean;
  activeGoalId: string | null;
  isSessionOpen: boolean;
  setEntries: (entries: StarlogEntry[]) => void;
  prependEntry: (entry: StarlogEntry) => void;
  setIsLoading: (loading: boolean) => void;
  setActiveGoalId: (id: string | null) => void;
  openSession: () => void;
  closeSession: () => void;
}

export const useStarlogStore = create<StarlogStore>((set) => ({
  entries: [],
  isLoading: false,
  activeGoalId: null,
  isSessionOpen: false,
  setEntries: (entries) => set({ entries }),
  prependEntry: (entry) => set((state) => ({ entries: [entry, ...state.entries] })),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setActiveGoalId: (id) => set({ activeGoalId: id }),
  openSession: () => set({ isSessionOpen: true }),
  closeSession: () => set({ isSessionOpen: false, activeGoalId: null }),
}));
