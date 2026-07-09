import { create } from 'zustand';
import type { EchoEntry } from './types';

export type EntryContainerUpdate =
  | { type: 'goal'; goalId: string; goalTitle: string }
  | { type: 'folder'; folderId: string; folderName: string };

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
  setEntryContainer: (entryId: string, container: EntryContainerUpdate) => void;
  removeEntry: (entryId: string) => void;
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
  setEntryContainer: (entryId, container) =>
    set((state) => ({
      entries: state.entries.map((entry) =>
        entry.id !== entryId
          ? entry
          : container.type === 'goal'
            ? {
                ...entry,
                goalId: container.goalId,
                goalTitle: container.goalTitle,
                folderId: null,
                folderName: undefined,
              }
            : {
                ...entry,
                goalId: null,
                goalTitle: undefined,
                folderId: container.folderId,
                folderName: container.folderName,
              },
      ),
    })),
  removeEntry: (entryId) =>
    set((state) => ({
      entries: state.entries.filter((entry) => entry.id !== entryId),
    })),
}));
