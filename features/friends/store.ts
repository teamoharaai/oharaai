import { create } from 'zustand';
import {
  acceptFriendRequest,
  declineFriendRequest,
  fetchFriendsSnapshot,
  searchFriends,
  sendFriendRequest,
} from './services/friends-service';
import {
  createFriendsStateController,
  createInitialFriendsState,
  type FriendsClientService,
  type FriendsStoreState,
} from './state-core';

const friendsService: FriendsClientService = {
  fetchSnapshot: fetchFriendsSnapshot,
  search: searchFriends,
  accept: acceptFriendRequest,
  decline: declineFriendRequest,
  send: sendFriendRequest,
};

export const useFriendsStore = create<FriendsStoreState>((set, get) => {
  const actions = createFriendsStateController(
    {
      get,
      set: (update) => set(update),
    },
    friendsService,
  );

  return {
    ...createInitialFriendsState(),
    ...actions,
  };
});
