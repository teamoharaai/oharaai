import { create } from 'zustand';
import type { StarlogEntry } from './types';

interface StarlogStore {
  entries: StarlogEntry[];
  activeGoalId: string | null;
  isSessionOpen: boolean;
  setEntries: (entries: StarlogEntry[]) => void;
  setActiveGoalId: (id: string | null) => void;
  openSession: () => void;
  closeSession: () => void;
}

export const useStarlogStore = create<StarlogStore>((set) => ({
  entries: [],
  activeGoalId: null,
  isSessionOpen: false,
  setEntries: (entries) => set({ entries }),
  setActiveGoalId: (id) => set({ activeGoalId: id }),
  openSession: () => set({ isSessionOpen: true }),
  closeSession: () => set({ isSessionOpen: false, activeGoalId: null }),
}));
