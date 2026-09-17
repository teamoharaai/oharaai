/**
 * Circles client services — pure async functions over `authedFetch` against the
 * `/api/circles/**` routes (docs/API_CONTRACT.md → "Circles endpoints"). Each
 * unwraps the `ApiResponse<T>` envelope and throws a typed `CirclesServiceError`.
 * No React, no store access (features/CLAUDE.md rule 5).
 */
import { authedFetch } from '@/lib/api/client';
import type { ApiErrorCode, ApiResponse } from '@/lib/api/contracts';
import type {
  CircleGoalSummary,
  CircleLinkKind,
  CirclesAuthor,
  CirclesFeedPost,
  IncomingGoalInvite,
  LinkableItems,
  PostComment,
  PublicGoalRef,
  SavedPost,
  SentGoalInvite,
} from '@/lib/db/circles-core';

export class CirclesServiceError extends Error {
  readonly code: ApiErrorCode | null;
  readonly status: number | null;

  constructor(
    message: string,
    options: { code?: ApiErrorCode | null; status?: number | null } = {},
  ) {
    super(message);
    this.name = 'CirclesServiceError';
    this.code = options.code ?? null;
    this.status = options.status ?? null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function readApiResponse<T>(response: Response): Promise<T> {
  let parsedBody: unknown;
  try {
    parsedBody = await response.json();
  } catch {
    throw new CirclesServiceError('The server returned an invalid response.', {
      status: response.status,
    });
  }

  if (!isRecord(parsedBody) || typeof parsedBody.ok !== 'boolean') {
    throw new CirclesServiceError('The server returned an invalid response.', {
      status: response.status,
    });
  }
  const body = parsedBody as unknown as ApiResponse<T>;

  if (!response.ok || !body.ok) {
    if (
      !body.ok
      && isRecord(body.error)
      && typeof body.error.code === 'string'
      && typeof body.error.message === 'string'
    ) {
      throw new CirclesServiceError(body.error.message, {
        code: body.error.code as ApiErrorCode,
        status: response.status,
      });
    }
    throw new CirclesServiceError('The request could not be completed.', {
      status: response.status,
    });
  }

  return body.data;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  return readApiResponse<T>(await authedFetch(path, init));
}

function sendJson<T>(
  path: string,
  method: 'POST' | 'PUT' | 'DELETE',
  body?: Record<string, unknown>,
): Promise<T> {
  return request<T>(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

// --- Feed & posts --------------------------------------------------------

export async function fetchFeed(before?: string, limit?: number): Promise<CirclesFeedPost[]> {
  const params = new URLSearchParams();
  if (before) params.set('before', before);
  if (limit) params.set('limit', String(limit));
  const query = params.toString();
  const data = await request<{ posts: CirclesFeedPost[] }>(
    `/api/circles/feed${query ? `?${query}` : ''}`,
  );
  return data.posts;
}

export interface CreatePostBody {
  body: string;
  image_path?: string;
  link_kind?: CircleLinkKind;
  link_ref_id?: string;
  link_description?: string;
}

export async function createPost(input: CreatePostBody): Promise<string> {
  const data = await sendJson<{ id: string }>('/api/circles/posts', 'POST', { ...input });
  return data.id;
}

export function deletePost(postId: string): Promise<{ id: string }> {
  return sendJson<{ id: string }>(`/api/circles/posts/${encodeURIComponent(postId)}`, 'DELETE');
}

// --- Encourage -----------------------------------------------------------

export function encouragePost(postId: string): Promise<{ postId: string; encouraged: boolean }> {
  return sendJson(`/api/circles/posts/${encodeURIComponent(postId)}/encourage`, 'POST');
}

export function unencouragePost(postId: string): Promise<{ postId: string; encouraged: boolean }> {
  return sendJson(`/api/circles/posts/${encodeURIComponent(postId)}/encourage`, 'DELETE');
}

export async function fetchEncouragers(postId: string): Promise<CirclesAuthor[]> {
  const data = await request<{ encouragers: CirclesAuthor[] }>(
    `/api/circles/posts/${encodeURIComponent(postId)}/encouragements`,
  );
  return data.encouragers;
}

// --- Comments ------------------------------------------------------------

export async function fetchComments(postId: string): Promise<PostComment[]> {
  const data = await request<{ comments: PostComment[] }>(
    `/api/circles/posts/${encodeURIComponent(postId)}/comments`,
  );
  return data.comments;
}

export async function createComment(postId: string, body: string): Promise<string> {
  const data = await sendJson<{ id: string }>(
    `/api/circles/posts/${encodeURIComponent(postId)}/comments`,
    'POST',
    { body },
  );
  return data.id;
}

export function deleteComment(commentId: string): Promise<{ id: string }> {
  return sendJson<{ id: string }>(
    `/api/circles/comments/${encodeURIComponent(commentId)}`,
    'DELETE',
  );
}

// --- Saved ---------------------------------------------------------------

export function savePost(postId: string): Promise<{ postId: string; saved: boolean }> {
  return sendJson(`/api/circles/posts/${encodeURIComponent(postId)}/save`, 'POST');
}

export function unsavePost(postId: string): Promise<{ postId: string; saved: boolean }> {
  return sendJson(`/api/circles/posts/${encodeURIComponent(postId)}/save`, 'DELETE');
}

export async function fetchSaved(): Promise<SavedPost[]> {
  const data = await request<{ saved: SavedPost[] }>('/api/circles/saved');
  return data.saved;
}

// --- Public goal ---------------------------------------------------------

export async function fetchPublicGoal(): Promise<PublicGoalRef | null> {
  const data = await request<{ goal: PublicGoalRef | null }>('/api/circles/public-goal');
  return data.goal;
}

export function setPublicGoal(goalId: string | null): Promise<{ id: string | null }> {
  return sendJson<{ id: string | null }>('/api/circles/public-goal', 'PUT', { goal_id: goalId });
}

export async function fetchFriendsPublicGoals(): Promise<CircleGoalSummary[]> {
  const data = await request<{ goals: CircleGoalSummary[] }>('/api/circles/friends/public-goals');
  return data.goals;
}

export async function fetchSharedWithMe(): Promise<CircleGoalSummary[]> {
  const data = await request<{ goals: CircleGoalSummary[] }>('/api/circles/shared-with-me');
  return data.goals;
}

// --- Invites -------------------------------------------------------------

export async function fetchIncomingInvites(): Promise<IncomingGoalInvite[]> {
  const data = await request<{ invites: IncomingGoalInvite[] }>('/api/circles/invites');
  return data.invites;
}

export async function fetchSentInvites(): Promise<SentGoalInvite[]> {
  const data = await request<{ invites: SentGoalInvite[] }>('/api/circles/invites/sent');
  return data.invites;
}

export async function sendInvites(goalId: string, inviteeIds: string[]): Promise<string[]> {
  const data = await sendJson<{ inviteIds: string[] }>('/api/circles/invites', 'POST', {
    goal_id: goalId,
    invitee_ids: inviteeIds,
  });
  return data.inviteIds;
}

export function respondToInvite(
  inviteId: string,
  response: 'accepted' | 'declined',
): Promise<{ id: string }> {
  return sendJson<{ id: string }>(
    `/api/circles/invites/${encodeURIComponent(inviteId)}/respond`,
    'POST',
    { response },
  );
}

export function withdrawInvite(inviteId: string): Promise<{ id: string }> {
  return sendJson<{ id: string }>(
    `/api/circles/invites/${encodeURIComponent(inviteId)}/withdraw`,
    'POST',
  );
}

// --- Linkable (composer picker) -----------------------------------------

export function fetchLinkable(): Promise<LinkableItems> {
  return request<LinkableItems>('/api/circles/linkable');
}

// --- Friends (shared endpoint, for the invite picker) --------------------
// Consumes the shared /api/friends HTTP resource rather than importing
// features/friends (CD-011: features stay independent; identity flows as data).

interface FriendsApiPerson {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
}

export async function fetchInviteableFriends(): Promise<CirclesAuthor[]> {
  const data = await request<{ friends: FriendsApiPerson[] }>('/api/friends');
  return data.friends.map((person) => ({
    id: person.id,
    username: person.username,
    displayName: person.display_name ?? '',
    avatarUrl: person.avatar_url ?? null,
  }));
}
