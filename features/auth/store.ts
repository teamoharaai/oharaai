import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import type { Profile, AuthState } from './types';

interface AuthStore extends AuthState {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  session: null,
  profile: null,
  loading: true,
  setSession: (session) => set({ session, isAuthenticated: !!session }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading, isLoading: loading }),
}));
