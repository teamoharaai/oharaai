import type {
  FriendErrorDetails,
  FriendRelationship,
  FriendsSnapshot,
  IncomingRequest,
  PersonSummary,
  SearchResult,
  SentRequest,
} from '@/features/friends/types';
import type { Database } from '@/types/supabase';

export type FriendConnectionProjection = Pick<
  Database['public']['Tables']['friend_connections']['Row'],
  'id' | 'requester_id' | 'addressee_id' | 'status' | 'created_at'
>;

type ProfileRpcRow =
  Database['public']['Functions']['get_profiles_by_ids']['Returns'][number];

export type FriendProfileProjection = Omit<ProfileRpcRow, 'avatar_url'> & {
  avatar_url: string | null;
};

export type FriendDomainErrorCode =
  | 'INVALID_INPUT'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'FORBIDDEN'
  | 'COOLDOWN';

export class FriendDataError extends Error {
  readonly code: FriendDomainErrorCode;
  readonly details?: FriendErrorDetails;

  constructor(
    code: FriendDomainErrorCode,
    message: string,
    details?: FriendErrorDetails,
  ) {
    super(message);
    this.name = 'FriendDataError';
    this.code = code;
    this.details = details;
  }
}

export interface FriendRpcErrorLike {
  code?: string;
  message?: string;
}

export type FriendRpcFailure =
  | 'profile_not_found'
  | 'cannot_friend_self'
  | 'pending_incoming'
  | 'already_connected'
  | 'cooldown'
  | 'request_not_found_or_handled';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const USERNAME_PREFIX_PATTERN = /^[a-z0-9_]+$/i;

export function validateUuid(value: unknown, fieldName: string): string {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!UUID_PATTERN.test(normalized)) {
    throw new FriendDataError(
      'INVALID_INPUT',
      `${fieldName} must be a valid UUID.`,
    );
  }
  return normalized;
}

export function validateAddresseeId(value: unknown, userId: string): string {
  const addresseeId = validateUuid(value, 'addressee_id');
  if (addresseeId === userId.toLowerCase()) {
    throw new FriendDataError(
      'INVALID_INPUT',
      'You cannot send a friend request to yourself.',
    );
  }
  return addresseeId;
}

export function validateUsernamePrefix(value: unknown): string {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (
    normalized.length < 3
    || normalized.length > 20
    || !USERNAME_PREFIX_PATTERN.test(normalized)
  ) {
    throw new FriendDataError(
      'INVALID_INPUT',
      'Username prefix must be 3 to 20 letters, numbers, or underscores.',
    );
  }
  return normalized.toLowerCase();
}

export function classifyFriendRpcError(
  error: FriendRpcErrorLike | null | undefined,
): FriendRpcFailure | null {
  if (!error) return null;

  switch (error.message) {
    case 'profile_not_found':
      return 'profile_not_found';
    case 'cannot_friend_self':
      return 'cannot_friend_self';
    case 'friend_request_pending_incoming':
      return 'pending_incoming';
    case 'friend_connection_exists':
      return 'already_connected';
    case 'friend_request_cooldown':
      return 'cooldown';
    case 'friend_request_not_found_or_already_handled':
      return 'request_not_found_or_handled';
    default:
      return error.code === '23505' ? 'already_connected' : null;
  }
}

function mapPerson(row: FriendProfileProjection): PersonSummary {
  return {
    id: row.id,
    username: row.username,
    display_name: row.display_name ?? '',
    avatar_url: row.avatar_url ?? null,
  };
}

function compareText(left: string, right: string): number {
  const normalizedLeft = left.toLocaleLowerCase('en-US');
  const normalizedRight = right.toLocaleLowerCase('en-US');

  if (normalizedLeft < normalizedRight) return -1;
  if (normalizedLeft > normalizedRight) return 1;
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function comparePeople(left: PersonSummary, right: PersonSummary): number {
  return (
    compareText(left.username, right.username)
    || compareText(left.display_name, right.display_name)
    || compareText(left.id, right.id)
  );
}

function compareNewest(
  left: IncomingRequest | SentRequest,
  right: IncomingRequest | SentRequest,
): number {
  const timeDifference =
    Date.parse(right.created_at) - Date.parse(left.created_at);
  return timeDifference || compareText(left.id, right.id);
}

function isParticipant(
  row: FriendConnectionProjection,
  userId: string,
): boolean {
  return row.requester_id === userId || row.addressee_id === userId;
}

function otherParticipantId(
  row: FriendConnectionProjection,
  userId: string,
): string {
  return row.requester_id === userId
    ? row.addressee_id
    : row.requester_id;
}

function requireProfile(
  profilesById: Map<string, PersonSummary>,
  profileId: string,
): PersonSummary {
  const profile = profilesById.get(profileId);
  if (!profile) {
    throw new Error('Friend profile hydration was incomplete');
  }
  return profile;
}

export function assembleFriendsSnapshot(
  userId: string,
  connectionRows: FriendConnectionProjection[],
  profileRows: FriendProfileProjection[],
): FriendsSnapshot {
  const rows = connectionRows.filter((row) => isParticipant(row, userId));
  const profilesById = new Map(
    profileRows.map((row) => {
      const profile = mapPerson(row);
      return [profile.id, profile] as const;
    }),
  );

  const acceptedRows = rows.filter((row) => row.status === 'accepted');
  const friends = acceptedRows
    .map((row) =>
      requireProfile(profilesById, otherParticipantId(row, userId)))
    .sort(comparePeople);

  const incoming_requests = rows
    .filter(
      (row) =>
        row.status === 'pending' && row.addressee_id === userId,
    )
    .map<IncomingRequest>((row) => ({
      id: row.id,
      created_at: row.created_at,
      from: requireProfile(profilesById, row.requester_id),
    }))
    .sort(compareNewest);

  const sent_requests = rows
    .filter(
      (row) =>
        row.status === 'pending' && row.requester_id === userId,
    )
    .map<SentRequest>((row) => ({
      id: row.id,
      created_at: row.created_at,
      to: requireProfile(profilesById, row.addressee_id),
    }))
    .sort(compareNewest);

  return {
    friends,
    friend_count: acceptedRows.length,
    incoming_requests,
    sent_requests,
  };
}

function relationshipForEdge(
  row: FriendConnectionProjection,
  userId: string,
): FriendRelationship {
  if (row.status === 'accepted') return 'friends';
  return row.requester_id === userId ? 'pending_out' : 'pending_in';
}

export function assembleFriendSearchResults(
  userId: string,
  profileRows: FriendProfileProjection[],
  connectionRows: FriendConnectionProjection[],
): SearchResult[] {
  const hitIds = new Set(profileRows.map((row) => row.id));
  const relationshipById = new Map<string, FriendRelationship>();

  for (const row of connectionRows) {
    if (
      !isParticipant(row, userId)
      || (row.status !== 'pending' && row.status !== 'accepted')
    ) {
      continue;
    }

    const otherId = otherParticipantId(row, userId);
    if (!hitIds.has(otherId)) continue;

    const relationship = relationshipForEdge(row, userId);
    if (
      relationship === 'friends'
      || relationshipById.get(otherId) !== 'friends'
    ) {
      relationshipById.set(otherId, relationship);
    }
  }

  return profileRows.map((row) => {
    const person = mapPerson(row);
    return {
      ...person,
      relation:
        person.id === userId
          ? 'self'
          : relationshipById.get(person.id) ?? 'none',
    };
  });
}
