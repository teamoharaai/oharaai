import { create } from 'zustand';
import { invalidateDashboardLatestEntry } from '@/lib/events/entries';
import { refreshMomentumAfterMeaningfulMutation } from '@/features/momentum/hooks/useMomentumHomeSummary';
import type { EntryRecord } from './types';
import { extractGoalReferences } from './editor-document';
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

function completedProgressReferenceIds(content: EntryDraft['content']): Set<string> {
  return new Set(extractGoalReferences(content)
    .filter((reference) => reference.progressEvidence && reference.checkboxCompleted)
    .map((reference) => reference.id));
}

function addedCompletedProgressEvidence(
  previous: EntryRecord | undefined,
  draft: EntryDraft,
): boolean {
  const completed = completedProgressReferenceIds(draft.content);
  if (!completed.size) return false;
  if (!previous) return true;
  const priorCompleted = completedProgressReferenceIds(previous.content);
  return [...completed].some((referenceId) => !priorCompleted.has(referenceId));
}

function isQualifiedLinkedReflection(entry: Pick<EntryRecord, 'completedAt' | 'entryType' | 'goals' | 'plainText' | 'reflectionType'>): boolean {
  return entry.entryType === 'reflection'
    && entry.goals.length > 0
    && (entry.plainText.replace(/\s/g, '').length >= 80 || Boolean(entry.completedAt && entry.reflectionType));
}

function reflectionEvidenceChanged(previous: EntryRecord | undefined, draft: EntryDraft): boolean {
  const nextQualified = draft.entryType === 'reflection'
    && draft.relationships.goalIds.length > 0
    && (draft.plainText.replace(/\s/g, '').length >= 80 || Boolean(draft.completedAt && draft.reflectionType));
  if (!previous) return nextQualified;
  const previousQualified = isQualifiedLinkedReflection(previous);
  if (previousQualified !== nextQualified) return true;
  if (!nextQualified) return false;
  const priorGoalIds = previous.goals.map((goal) => goal.id).sort();
  const nextGoalIds = [...draft.relationships.goalIds].sort();
  return previous.reflectionType !== (draft.reflectionType ?? null)
    || priorGoalIds.join(':') !== nextGoalIds.join(':');
}

export const useEntriesStore = create<EntriesStore>((set, get) => ({
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
    if (
      reflectionEvidenceChanged(undefined, draft)
      || addedCompletedProgressEvidence(undefined, draft)
    ) {
      void refreshMomentumAfterMeaningfulMutation();
    }
    return entry;
  },
  updateEntry: async (entryId, draft) => {
    const previous = get().entries.find((current) => current.id === entryId);
    const entry = await updateEntryRequest(entryId, draft);
    set((state) => ({
      entries: state.entries.map((current) => current.id === entryId ? entry : current),
    }));
    invalidateDashboardLatestEntry();
    if (
      reflectionEvidenceChanged(previous, draft)
      || addedCompletedProgressEvidence(previous, draft)
    ) {
      void refreshMomentumAfterMeaningfulMutation();
    }
    return entry;
  },
  deleteEntry: async (entryId) => {
    const previous = get().entries.find((current) => current.id === entryId);
    await deleteEntryRequest(entryId);
    set((state) => ({ entries: state.entries.filter((entry) => entry.id !== entryId) }));
    invalidateDashboardLatestEntry();
    if (previous && (
      isQualifiedLinkedReflection(previous)
      || completedProgressReferenceIds(previous.content).size > 0
    )) {
      void refreshMomentumAfterMeaningfulMutation();
    }
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
