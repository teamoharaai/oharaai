import { useGoalStore } from '@/features/goals/store';
import { useProfileStore } from '@/features/profile/store';
import { useEchoStore } from '@/features/echo/store';
import { useEchoDraftStore } from '@/features/echo/draft-store';
import { useFriendsStore } from '@/features/friends/store';
import { useProjectStore } from '@/features/projects/store';
import { useEntriesStore } from '@/features/entries/store';
import { useUIStore } from '@/store/uiStore';

/**
 * Reset every Zustand store to its initial data state.
 * Call synchronously before supabase.auth.signOut() so no stale data
 * is visible while the signOut round-trip is in flight.
 *
 * For useEchoDraftStore the persisted storage key is also cleared so
 * the next user does not inherit draft text from the previous session.
 */
export function clearAllStores(): void {
  useFriendsStore.getState().reset();

  useGoalStore.setState({ goals: [], selectedGoalId: null, isLoading: false });

  useProfileStore.setState({
    profile: null,
    cachedInsight: null,
    insightFetched: false,
    insightLoading: false,
    isLoading: false,
  });

  useEchoStore.setState({
    entries: [],
    isLoading: false,
    activeGoalId: null,
    isSessionOpen: false,
  });

  useProjectStore.setState({ projects: [], isLoading: false, error: null });
  useEntriesStore.setState({ entries: [], goals: [], isLoading: false, error: null });

  // In-memory reset then remove the persisted localStorage key
  // so the next user never hydrates stale drafts.
  useEchoDraftStore.setState({ draftsByContext: {}, lastLinkedGoal: null, hasHydrated: false });
  useEchoDraftStore.persist.clearStorage();

  // Reset UI prefs (e.g. sidebar collapse) so they don't leak across users
  // on a shared device.
  useUIStore.setState({
    sidebarCollapsed: false,
    rightPaneWidth: 420,
    entriesTab: 'notes',
    entriesIntelligenceOpen: false,
  });
  useUIStore.persist.clearStorage();
}
