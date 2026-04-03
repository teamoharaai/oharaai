import { create } from 'zustand';
import type { EchoEntry } from './types';

interface EchoStore {
  entries: EchoEntry[];
  isLoading: boolean;
  activeGoalId: string | null;
  isSessionOpen: boolean;
  setEntries: (entries: EchoEntry[]) => void;
  prependEntry: (entry: EchoEntry) => void;
  setIsLoading: (loading: boolean) => void;
  setActiveGoalId: (id: string | null) => void;
  openSession: () => void;
  closeSession: () => void;
}

export const useEchoStore = create<EchoStore>((set) => ({
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
