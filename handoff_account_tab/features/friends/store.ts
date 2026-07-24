// Small zustand slice for the Friends popover. Kept intentionally minimal —
// it holds the snapshot and exposes optimistic mutators. The popover is the
// only consumer today; if other screens start reading friends (e.g. a Goal's
// shared-with chip), promote the read path to a query key with react-query.

import { create } from 'zustand';
import {
  acceptFriendRequest,
  declineFriendRequest,
  fetchFriendsSnapshot,
  sendFriendRequest,
} from './api';
import type { FriendsSnapshot, IncomingRequest, PersonSummary, SentRequest } from './types';

interface FriendsState extends FriendsSnapshot {
  isLoading: boolean;
  loadError: string | null;
  hydrate: () => Promise<void>;
  invalidate: () => void;
  optimisticAccept: (request: IncomingRequest) => Promise<void>;
  optimisticDecline: (request: IncomingRequest) => Promise<void>;
  optimisticSend: (person: PersonSummary) => Promise<void>;
}

const EMPTY: FriendsSnapshot = {
  friends: [],
  friend_count: 0,
  incoming_requests: [],
  sent_requests: [],
};

let inflight: Promise<void> | null = null;

export const useFriendsStore = create<FriendsState>((set, get) => ({
  ...EMPTY,
  isLoading: false,
  loadError: null,

  hydrate: async () => {
    if (inflight) return inflight;
    set({ isLoading: true, loadError: null });
    inflight = (async () => {
      try {
        const snap = await fetchFriendsSnapshot();
        set({ ...snap, isLoading: false });
      } catch (err) {
        set({
          isLoading: false,
          loadError: err instanceof Error ? err.message : 'Failed to load friends.',
        });
      } finally {
        inflight = null;
      }
    })();
    return inflight;
  },

  invalidate: () => {
    inflight = null;
    void get().hydrate();
  },

  optimisticAccept: async (request) => {
    const before = get();
    set({
      incoming_requests: before.incoming_requests.filter((r) => r.id !== request.id),
      friends: [request.from, ...before.friends],
      friend_count: before.friend_count + 1,
    });
    try {
      await acceptFriendRequest(request.id);
    } catch (err) {
      set(before);
      throw err;
    }
  },

  optimisticDecline: async (request) => {
    const before = get();
    set({ incoming_requests: before.incoming_requests.filter((r) => r.id !== request.id) });
    try {
      await declineFriendRequest(request.id);
    } catch (err) {
      set(before);
      throw err;
    }
  },

  optimisticSend: async (person) => {
    const before = get();
    // We don't yet have the connection id — the server returns it. Use a
    // temporary id so the UI can render the "Pending" pill immediately; the
    // next hydrate() replaces it with the real row.
    const temp: SentRequest = {
      id: `temp:${person.id}`,
      created_at: new Date().toISOString(),
      to: person,
    };
    set({ sent_requests: [temp, ...before.sent_requests] });
    try {
      await sendFriendRequest(person.id);
      void get().hydrate();
    } catch (err) {
      set(before);
      throw err;
    }
  },
}));
