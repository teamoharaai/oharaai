import { create } from 'zustand';
import { invalidateDashboardLatestEntry } from '@/lib/events/entries';
import type { EntryRecord } from './types';
import {
  createEntry as createEntryRequest,
  deleteEntry as deleteEntryRequest,
  fetchEntries,
  fetchEntryGoalOptions,
  updateEntry as updateEntryRequest,
} from './services/entry-service';
import type { EntryDraft, EntryGoalOption, EntryType } from './types';

interface EntriesStore {
  entries: EntryRecord[];
  goals: EntryGoalOption[];
  isLoading: boolean;
  error: string | null;
  loadEntries: (entryType?: EntryType) => Promise<void>;
  loadContext: () => Promise<void>;
  createEntry: (draft: EntryDraft) => Promise<EntryRecord>;
  updateEntry: (entryId: string, draft: EntryDraft) => Promise<EntryRecord>;
  deleteEntry: (entryId: string) => Promise<void>;
  upsertEntry: (entry: EntryRecord) => void;
}

export const useEntriesStore = create<EntriesStore>((set) => ({
  entries: [],
  goals: [],
  isLoading: false,
  error: null,
  loadEntries: async (entryType) => {
    set({ isLoading: true, error: null });
    try {
      const entries = await fetchEntries(entryType);
      set((state) => ({
        entries: entryType
          ? [
              ...state.entries.filter((entry) => entry.entryType !== entryType),
              ...entries,
            ]
          : entries,
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Could not load entries' });
    } finally {
      set({ isLoading: false });
    }
  },
  loadContext: async () => {
    try {
      const goals = await fetchEntryGoalOptions();
      set({ goals });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Could not load goal context' });
    }
  },
  createEntry: async (draft) => {
    const entry = await createEntryRequest(draft);
    set((state) => ({ entries: [entry, ...state.entries] }));
    invalidateDashboardLatestEntry();
    return entry;
  },
  updateEntry: async (entryId, draft) => {
    const entry = await updateEntryRequest(entryId, draft);
    set((state) => ({
      entries: state.entries.map((current) => current.id === entryId ? entry : current),
    }));
    invalidateDashboardLatestEntry();
    return entry;
  },
  deleteEntry: async (entryId) => {
    await deleteEntryRequest(entryId);
    set((state) => ({ entries: state.entries.filter((entry) => entry.id !== entryId) }));
    invalidateDashboardLatestEntry();
  },
  upsertEntry: (entry) => set((state) => {
    const exists = state.entries.some((current) => current.id === entry.id);
    return {
      entries: exists
        ? state.entries.map((current) => current.id === entry.id ? entry : current)
        : [entry, ...state.entries],
    };
  }),
}));
