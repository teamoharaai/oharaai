import { useEffect } from 'react';
import { useFriendsStore } from '../store';

export function useFriends() {
  const friends = useFriendsStore((state) => state.friends);
  const friendCount = useFriendsStore((state) => state.friendCount);
  const incomingRequests = useFriendsStore(
    (state) => state.incomingRequests,
  );
  const sentRequests = useFriendsStore((state) => state.sentRequests);
  const hasHydrated = useFriendsStore((state) => state.hasHydrated);
  const isInitialLoading = useFriendsStore(
    (state) => state.isInitialLoading,
  );
  const isRefreshing = useFriendsStore(
    (state) => state.isRefreshing,
  );
  const loadError = useFriendsStore((state) => state.loadError);
  const connectionMutations = useFriendsStore(
    (state) => state.connectionMutations,
  );
  const sendMutations = useFriendsStore(
    (state) => state.sendMutations,
  );
  const searchQuery = useFriendsStore((state) => state.searchQuery);
  const searchResults = useFriendsStore(
    (state) => state.searchResults,
  );
  const isSearchLoading = useFriendsStore(
    (state) => state.isSearchLoading,
  );
  const searchError = useFriendsStore((state) => state.searchError);
  const hydrate = useFriendsStore((state) => state.hydrate);
  const refresh = useFriendsStore((state) => state.refresh);
  const acceptRequest = useFriendsStore(
    (state) => state.acceptRequest,
  );
  const declineRequest = useFriendsStore(
    (state) => state.declineRequest,
  );
  const sendRequest = useFriendsStore((state) => state.sendRequest);
  const setSearchQuery = useFriendsStore(
    (state) => state.setSearchQuery,
  );

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return {
    friends,
    friendCount,
    incomingRequests,
    sentRequests,
    hasHydrated,
    isInitialLoading,
    isRefreshing,
    loadError,
    connectionMutations,
    sendMutations,
    searchQuery,
    searchResults,
    isSearchLoading,
    searchError,
    refresh,
    acceptRequest,
    declineRequest,
    sendRequest,
    setSearchQuery,
  };
}
