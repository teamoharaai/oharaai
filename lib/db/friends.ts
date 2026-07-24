import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  FriendErrorDetails,
  FriendsSnapshot,
  SearchResult,
} from '@/features/friends/types';
import supabase from './client';
import {
  assembleFriendsSnapshot,
  assembleFriendSearchResults,
  classifyFriendRpcError,
  FriendDataError,
  type FriendConnectionProjection,
  type FriendProfileProjection,
} from './friends-core';

type DbClient = SupabaseClient;
type FriendResponse = 'accepted' | 'declined';

const CONNECTION_COLUMNS =
  'id, requester_id, addressee_id, status, created_at';
const CONNECTION_PAGE_SIZE = 500;
const PROFILE_BATCH_SIZE = 500;
const COOLDOWN_DAYS = 7;
const COOLDOWN_MILLISECONDS =
  COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

function participantFilter(userId: string): string {
  return `requester_id.eq.${userId},addressee_id.eq.${userId}`;
}

function searchedParticipantFilter(
  userId: string,
  profileIds: string[],
): string {
  const ids = profileIds.join(',');
  return [
    `and(requester_id.eq.${userId},addressee_id.in.(${ids}))`,
    `and(addressee_id.eq.${userId},requester_id.in.(${ids}))`,
  ].join(',');
}

async function getLiveConnections(
  userId: string,
  client: DbClient,
): Promise<FriendConnectionProjection[]> {
  const rows: FriendConnectionProjection[] = [];

  for (let from = 0; ; from += CONNECTION_PAGE_SIZE) {
    const { data, error } = await client
      .from('friend_connections')
      .select(CONNECTION_COLUMNS)
      .in('status', ['pending', 'accepted'])
      .or(participantFilter(userId))
      .order('created_at', { ascending: false })
      .order('id', { ascending: true })
      .range(from, from + CONNECTION_PAGE_SIZE - 1);

    if (error) throw error;

    const page =
      (data ?? []) as unknown as FriendConnectionProjection[];
    rows.push(...page);
    if (page.length < CONNECTION_PAGE_SIZE) break;
  }

  return Array.from(
    new Map(rows.map((row) => [row.id, row])).values(),
  );
}

function counterpartIds(
  rows: FriendConnectionProjection[],
  userId: string,
): string[] {
  return Array.from(
    new Set(
      rows
        .filter(
          (row) =>
            row.requester_id === userId || row.addressee_id === userId,
        )
        .map((row) =>
          row.requester_id === userId
            ? row.addressee_id
            : row.requester_id),
    ),
  );
}

async function hydrateConnectedProfiles(
  profileIds: string[],
  client: DbClient,
): Promise<FriendProfileProjection[]> {
  const profiles: FriendProfileProjection[] = [];

  for (let index = 0; index < profileIds.length; index += PROFILE_BATCH_SIZE) {
    const userIds = profileIds.slice(index, index + PROFILE_BATCH_SIZE);
    const { data, error } = await client.rpc('get_profiles_by_ids', {
      user_ids: userIds,
    });

    if (error) throw error;
    profiles.push(
      ...((data ?? []) as unknown as FriendProfileProjection[]),
    );
  }

  return profiles;
}

export async function getFriendsSnapshot(
  userId: string,
  client: DbClient = supabase,
): Promise<FriendsSnapshot> {
  const rows = await getLiveConnections(userId, client);
  const profiles = await hydrateConnectedProfiles(
    counterpartIds(rows, userId),
    client,
  );

  return assembleFriendsSnapshot(userId, rows, profiles);
}

export async function searchFriendsByUsername(
  usernamePrefix: string,
  userId: string,
  client: DbClient = supabase,
): Promise<SearchResult[]> {
  const { data, error } = await client.rpc(
    'search_profiles_by_username',
    { query: usernamePrefix },
  );
  if (error) throw error;

  const profiles =
    (data ?? []) as unknown as FriendProfileProjection[];
  if (profiles.length === 0) return [];

  const { data: connectionData, error: connectionError } = await client
    .from('friend_connections')
    .select(CONNECTION_COLUMNS)
    .in('status', ['pending', 'accepted'])
    .or(
      searchedParticipantFilter(
        userId,
        profiles.map((profile) => profile.id),
      ),
    );

  if (connectionError) throw connectionError;

  return assembleFriendSearchResults(
    userId,
    profiles,
    (connectionData ?? []) as unknown as FriendConnectionProjection[],
  );
}

async function getCooldownDetails(
  requesterId: string,
  addresseeId: string,
  client: DbClient,
): Promise<FriendErrorDetails> {
  const { data, error } = await client
    .from('friend_connections')
    .select('created_at, responded_at')
    .eq('requester_id', requesterId)
    .eq('addressee_id', addresseeId)
    .eq('status', 'declined')
    .order('responded_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let retryAt: string | null = null;
  if (!error && data) {
    const declinedAt =
      (data.responded_at as string | null)
      ?? (data.created_at as string | null);
    const declinedTimestamp = declinedAt ? Date.parse(declinedAt) : NaN;
    if (Number.isFinite(declinedTimestamp)) {
      retryAt = new Date(
        declinedTimestamp + COOLDOWN_MILLISECONDS,
      ).toISOString();
    }
  }

  return {
    reason: 'cooldown',
    cooldown_days: COOLDOWN_DAYS,
    retry_at: retryAt,
  };
}

export async function sendFriendRequest(
  addresseeId: string,
  requesterId: string,
  client: DbClient = supabase,
): Promise<string> {
  const { data, error } = await client.rpc('send_friend_request', {
    p_addressee_id: addresseeId,
  });

  if (error) {
    switch (classifyFriendRpcError(error)) {
      case 'profile_not_found':
        throw new FriendDataError(
          'NOT_FOUND',
          'Profile not found.',
          { reason: 'profile_not_found' },
        );
      case 'cannot_friend_self':
        throw new FriendDataError(
          'INVALID_INPUT',
          'You cannot send a friend request to yourself.',
        );
      case 'pending_incoming':
        throw new FriendDataError(
          'CONFLICT',
          'This person has already sent you a friend request.',
          { reason: 'pending_incoming' },
        );
      case 'already_connected':
        throw new FriendDataError(
          'CONFLICT',
          'You are already friends with this person.',
          { reason: 'already_connected' },
        );
      case 'cooldown':
        throw new FriendDataError(
          'COOLDOWN',
          'You can send another friend request after the cooldown ends.',
          await getCooldownDetails(requesterId, addresseeId, client),
        );
      default:
        throw error;
    }
  }

  if (typeof data !== 'string') {
    throw new Error('Friend request did not return a connection ID');
  }
  return data;
}

export async function respondToFriendRequest(
  connectionId: string,
  userId: string,
  response: FriendResponse,
  client: DbClient = supabase,
): Promise<string> {
  const { data: existing, error: readError } = await client
    .from('friend_connections')
    .select(CONNECTION_COLUMNS)
    .eq('id', connectionId)
    .maybeSingle();

  if (readError) throw readError;
  if (!existing) {
    throw new FriendDataError(
      'NOT_FOUND',
      'Friend request not found.',
      { reason: 'request_not_found' },
    );
  }

  const row = existing as unknown as FriendConnectionProjection;
  if (row.addressee_id !== userId) {
    throw new FriendDataError(
      'FORBIDDEN',
      'Only the request addressee can respond to it.',
      { reason: 'forbidden_transition' },
    );
  }
  if (row.status !== 'pending') {
    throw new FriendDataError(
      'CONFLICT',
      'Friend request has already been handled.',
      { reason: 'already_handled' },
    );
  }

  const { data, error } = await client.rpc(
    'respond_to_friend_request',
    {
      p_connection_id: connectionId,
      p_response: response,
    },
  );

  if (error) {
    if (
      classifyFriendRpcError(error)
      === 'request_not_found_or_handled'
    ) {
      throw new FriendDataError(
        'CONFLICT',
        'Friend request has already been handled.',
        { reason: 'already_handled' },
      );
    }
    throw error;
  }

  if (typeof data !== 'string') {
    throw new Error('Friend response did not return a connection ID');
  }
  return data;
}
