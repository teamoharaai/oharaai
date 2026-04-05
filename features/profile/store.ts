import { create } from 'zustand';
import type { CharacterProfile } from './types';

interface ProfileStore {
  profile: CharacterProfile | null;
  isLoading: boolean;
  /** Cached intelligence insight for this session. null = not yet fetched or dormant. */
  cachedInsight: string | null;
  /** True once the intelligence API has been called this session (avoids re-fetching). */
  insightFetched: boolean;
  insightLoading: boolean;
  setProfile: (profile: CharacterProfile | null) => void;
  setIsLoading: (loading: boolean) => void;
  setCachedInsight: (insight: string | null) => void;
  setInsightFetched: (fetched: boolean) => void;
  setInsightLoading: (loading: boolean) => void;
}

export const useProfileStore = create<ProfileStore>((set) => ({
  profile: null,
  isLoading: false,
  cachedInsight: null,
  insightFetched: false,
  insightLoading: false,
  setProfile: (profile) => set({ profile }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setCachedInsight: (insight) => set({ cachedInsight: insight }),
  setInsightFetched: (fetched) => set({ insightFetched: fetched }),
  setInsightLoading: (loading) => set({ insightLoading: loading }),
}));
