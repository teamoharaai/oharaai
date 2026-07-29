import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import {
  EMPTY_ECHO_ENTRY_DRAFT,
  isEntryDraftEmpty,
  migrateEchoDraftsByContext,
  type EchoEntryDraft,
} from './composer-state';

export type EchoDraftGoalRef = {
  id: string;
  title: string;
};

interface EchoDraftStore {
  draftsByContext: Record<string, EchoEntryDraft>;
  lastLinkedGoal: EchoDraftGoalRef | null;
  hasHydrated: boolean;
  setDraft: (contextKey: string, draft: EchoEntryDraft) => void;
  getDraft: (contextKey: string) => EchoEntryDraft;
  clearDraft: (contextKey: string) => void;
  setLastLinkedGoal: (goal: EchoDraftGoalRef | null) => void;
  setHasHydrated: (hydrated: boolean) => void;
}

const webStorage: StateStorage = {
  getItem: (name) => {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(name);
  },
  setItem: (name, value) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(name, value);
  },
  removeItem: (name) => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(name);
  },
};

const echoDraftStorage = webStorage;

export function getEchoDraftContextKey(goalId: string | null) {
  return goalId ? `goal:${goalId}` : 'global';
}

export const useEchoDraftStore = create<EchoDraftStore>()(
  persist(
    (set, get) => ({
      draftsByContext: {},
      lastLinkedGoal: null,
      hasHydrated: false,
      setDraft: (contextKey, draft) =>
        set((state) => {
          if (isEntryDraftEmpty(draft)) {
            const nextDrafts = { ...state.draftsByContext };
            delete nextDrafts[contextKey];
            return { draftsByContext: nextDrafts };
          }

          return {
            draftsByContext: {
              ...state.draftsByContext,
              [contextKey]: draft,
            },
          };
        }),
      getDraft: (contextKey) => get().draftsByContext[contextKey] ?? EMPTY_ECHO_ENTRY_DRAFT,
      clearDraft: (contextKey) =>
        set((state) => {
          const nextDrafts = { ...state.draftsByContext };
          delete nextDrafts[contextKey];
          return { draftsByContext: nextDrafts };
        }),
      setLastLinkedGoal: (goal) => set({ lastLinkedGoal: goal }),
      setHasHydrated: (hydrated) => set({ hasHydrated: hydrated }),
    }),
    {
      name: 'ohara-echo-drafts',
      version: 2,
      migrate: (persistedState) => {
        const state =
          persistedState && typeof persistedState === 'object'
            ? persistedState as Record<string, unknown>
            : {};

        return {
          ...state,
          draftsByContext: migrateEchoDraftsByContext(state.draftsByContext),
        };
      },
      storage: createJSONStorage(() => echoDraftStorage),
      partialize: (state) => ({
        draftsByContext: state.draftsByContext,
        lastLinkedGoal: state.lastLinkedGoal,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.warn('[echo-drafts] hydration failed:', error);
        }
        state?.setHasHydrated(true);
      },
    }
  )
);
