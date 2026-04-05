import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

export type EchoDraftGoalRef = {
  id: string;
  title: string;
};

interface EchoDraftStore {
  draftsByContext: Record<string, string>;
  lastLinkedGoal: EchoDraftGoalRef | null;
  hasHydrated: boolean;
  setDraft: (contextKey: string, text: string) => void;
  getDraft: (contextKey: string) => string;
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

const echoDraftStorage = Platform.OS === 'web' ? webStorage : AsyncStorage;

export function getEchoDraftContextKey(goalId: string | null) {
  return goalId ? `goal:${goalId}` : 'global';
}

export const useEchoDraftStore = create<EchoDraftStore>()(
  persist(
    (set, get) => ({
      draftsByContext: {},
      lastLinkedGoal: null,
      hasHydrated: false,
      setDraft: (contextKey, text) =>
        set((state) => {
          if (!text.length) {
            const nextDrafts = { ...state.draftsByContext };
            delete nextDrafts[contextKey];
            return { draftsByContext: nextDrafts };
          }

          return {
            draftsByContext: {
              ...state.draftsByContext,
              [contextKey]: text,
            },
          };
        }),
      getDraft: (contextKey) => get().draftsByContext[contextKey] ?? '',
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
