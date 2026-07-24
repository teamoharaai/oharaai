// Types for the Friends surface.
//
// These mirror the shape returned by search_profiles_by_username and
// get_profiles_by_ids (see migration 028), plus the friend_connections row
// filtered down to the fields the UI actually needs.

export interface PersonSummary {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
}

/**
 * Result of an add-people search. `relation` tells the UI which action pill to
 * render (Add / Pending / Friends / You). Computed server-side because it
 * requires reading friend_connections, which the search RPC doesn't join.
 */
export interface SearchResult extends PersonSummary {
  relation: 'none' | 'pending_out' | 'pending_in' | 'friends' | 'self';
}

/**
 * An incoming friend request the current user can Accept or Decline.
 * `id` is the friend_connections row id (needed for accept/decline routes).
 */
export interface IncomingRequest {
  id: string;
  created_at: string;
  from: PersonSummary;
}

/**
 * A request the current user sent that hasn't been answered yet.
 * Surfaces as a footnote below the Requests list — not its own inbox.
 */
export interface SentRequest {
  id: string;
  created_at: string;
  to: PersonSummary;
}

export interface FriendsSnapshot {
  friends: PersonSummary[];
  friend_count: number;
  incoming_requests: IncomingRequest[];
  sent_requests: SentRequest[];
}

export type FriendsTab = 'friends' | 'requests' | 'add';
