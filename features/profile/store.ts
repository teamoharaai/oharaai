import { create } from 'zustand';
import type { CharacterProfile } from './types';

interface ProfileStore {
  profile: CharacterProfile | null;
  isLoading: boolean;
  setProfile: (profile: CharacterProfile | null) => void;
  setIsLoading: (loading: boolean) => void;
}

export const useProfileStore = create<ProfileStore>((set) => ({
  profile: null,
  isLoading: false,
  setProfile: (profile) => set({ profile }),
  setIsLoading: (loading) => set({ isLoading: loading }),
}));
