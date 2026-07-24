export interface PersonSummary {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
}

export type FriendRelationship =
  | 'none'
  | 'pending_out'
  | 'pending_in'
  | 'friends'
  | 'self';

export interface SearchResult extends PersonSummary {
  relation: FriendRelationship;
}

export interface IncomingRequest {
  id: string;
  created_at: string;
  from: PersonSummary;
}

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

export interface FriendsSearchResult {
  results: SearchResult[];
}

export interface FriendMutationResult {
  id: string;
}

export type FriendErrorReason =
  | 'profile_not_found'
  | 'already_connected'
  | 'pending_incoming'
  | 'request_not_found'
  | 'already_handled'
  | 'forbidden_transition'
  | 'cooldown';

export type FriendErrorDetails =
  | {
      reason: Exclude<FriendErrorReason, 'cooldown'>;
    }
  | {
      reason: 'cooldown';
      cooldown_days: number;
      retry_at: string | null;
    };
