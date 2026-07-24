// Thin client wrappers around the /api/friends/* routes. Every call goes
// through authedFetch so 401s land users on /login without each caller
// reimplementing that dance.

import { authedFetch } from '@/lib/api/client';
import type { ApiResponse } from '@/lib/api/contracts';
import type {
  FriendsSnapshot,
  IncomingRequest,
  PersonSummary,
  SearchResult,
  SentRequest,
} from './types';

async function unwrap<T>(res: Response): Promise<T> {
  const body = (await res.json()) as ApiResponse<T>;
  if (!body.ok) throw new Error(body.error.message);
  return body.data;
}

export async function fetchFriendsSnapshot(): Promise<FriendsSnapshot> {
  const [friendsRes, requestsRes] = await Promise.all([
    authedFetch('/api/friends'),
    authedFetch('/api/friends/requests'),
  ]);
  const friendsBody = await unwrap<{ friends: PersonSummary[]; friend_count: number }>(friendsRes);
  const requestsBody = await unwrap<{ incoming: IncomingRequest[]; sent: SentRequest[] }>(requestsRes);
  return {
    friends: friendsBody.friends,
    friend_count: friendsBody.friend_count,
    incoming_requests: requestsBody.incoming,
    sent_requests: requestsBody.sent,
  };
}

export async function searchPeople(query: string): Promise<SearchResult[]> {
  // The RPC will reject <3 chars, but we short-circuit so we don't spam the
  // network while a user is typing "ma" → "may" → "maya".
  if (query.trim().length < 3) return [];
  const res = await authedFetch(`/api/friends/search?q=${encodeURIComponent(query.trim())}`);
  const body = await unwrap<{ results: SearchResult[] }>(res);
  return body.results;
}

export async function sendFriendRequest(addresseeId: string): Promise<void> {
  const res = await authedFetch('/api/friends/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ addressee_id: addresseeId }),
  });
  await unwrap<{ id: string }>(res);
}

export async function acceptFriendRequest(connectionId: string): Promise<void> {
  const res = await authedFetch(`/api/friends/${connectionId}/accept`, { method: 'POST' });
  await unwrap<{ id: string }>(res);
}

export async function declineFriendRequest(connectionId: string): Promise<void> {
  const res = await authedFetch(`/api/friends/${connectionId}/decline`, { method: 'POST' });
  await unwrap<{ id: string }>(res);
}
