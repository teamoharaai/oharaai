import { create } from 'zustand';
import { deleteEntry as deleteEntryRecord } from './services/echo-service';
import type { BrtCategory, EchoEntry } from './types';

export type EntryContainerUpdate =
  | { type: 'goal'; goalId: string; goalTitle: string }
  | { type: 'folder'; folderId?: string; folderName: string };

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
  updateEntryFields: (
    entryId: string,
    fields: { content?: string; title?: string | null; brtCategory?: BrtCategory | null },
  ) => void;
  removeEntry: (entryId: string) => void;
  deleteEntry: (entryId: string) => Promise<void>;
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
                folderId: undefined,
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
  // Optimistic field patch after a successful updateEntry() save. Mirrors
  // setEntryContainer's map-and-merge shape; only overwrites the fields the
  // caller supplied (title: null clears the title back to undefined). Does not
  // touch container assignment — that stays setEntryContainer's job.
  updateEntryFields: (entryId, fields) =>
    set((state) => ({
      entries: state.entries.map((entry) =>
        entry.id !== entryId
          ? entry
          : {
              ...entry,
              ...(fields.content !== undefined ? { content: fields.content } : {}),
              ...(fields.title !== undefined ? { title: fields.title ?? undefined } : {}),
              ...(fields.brtCategory !== undefined
                ? { brtCategory: fields.brtCategory ?? undefined }
                : {}),
            },
      ),
    })),
  removeEntry: (entryId) =>
    set((state) => ({
      entries: state.entries.filter((entry) => entry.id !== entryId),
    })),
  // Mirrors goal-store.deleteGoal: persist first (throws on failure so the
  // caller can surface an error), then drop the row from the list. Reuses the
  // same filter as removeEntry — which stays a standalone optimistic remove for
  // the move flow's "entry gone server-side" (404) path.
  deleteEntry: async (entryId) => {
    await deleteEntryRecord(entryId);
    set((state) => ({
      entries: state.entries.filter((entry) => entry.id !== entryId),
    }));
  },
}));
