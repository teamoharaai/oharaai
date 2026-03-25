import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import type { Goal } from '@/lib/types';

// ─── Auth Store ───────────────────────────────────────────────────────────────

interface AuthState {
  session: Session | null;
  loading: boolean;
  setSession: (session: Session | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  loading: true,
  setSession: (session) => set({ session }),
  setLoading: (loading) => set({ loading }),
}));

// ─── Goals Store ──────────────────────────────────────────────────────────────

interface GoalsState {
  goals: Goal[];
  loading: boolean;
  fetchGoals: () => Promise<void>;
  createGoal: (goal: Omit<Goal, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateGoal: (id: string, updates: Partial<Goal>) => Promise<void>;
}

export const useGoalsStore = create<GoalsState>((set) => ({
  goals: [],
  loading: false,
  fetchGoals: async () => {
    // TODO: implement in Pillar 1 session
  },
  createGoal: async () => {
    // TODO: implement in Pillar 1 session
  },
  updateGoal: async () => {
    // TODO: implement in Pillar 1 session
  },
}));
