import { authedFetch } from '@/lib/api/client';
import type {
  ApiErrorCode,
  ApiResponse,
} from '@/lib/api/contracts';
import type {
  FriendErrorDetails,
  FriendMutationResult,
  FriendsSearchResult,
  FriendsSnapshot,
} from '@/features/friends/types';

export class FriendsServiceError extends Error {
  readonly code: ApiErrorCode | null;
  readonly details: FriendErrorDetails | null;
  readonly status: number | null;

  constructor(
    message: string,
    options: {
      code?: ApiErrorCode | null;
      details?: FriendErrorDetails | null;
      status?: number | null;
    } = {},
  ) {
    super(message);
    this.name = 'FriendsServiceError';
    this.code = options.code ?? null;
    this.details = options.details ?? null;
    this.status = options.status ?? null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFriendErrorDetails(value: unknown): value is FriendErrorDetails {
  if (!isRecord(value) || typeof value.reason !== 'string') return false;
  switch (value.reason) {
    case 'cooldown':
      return (
        typeof value.cooldown_days === 'number'
        && (typeof value.retry_at === 'string' || value.retry_at === null)
      );
    case 'profile_not_found':
    case 'already_connected':
    case 'pending_incoming':
    case 'request_not_found':
    case 'already_handled':
    case 'forbidden_transition':
      return true;
    default:
      return false;
  }
}

async function readApiResponse<T>(response: Response): Promise<T> {
  let parsedBody: unknown;
  try {
    parsedBody = await response.json();
  } catch {
    throw new FriendsServiceError('The server returned an invalid response.', {
      status: response.status,
    });
  }

  if (!isRecord(parsedBody) || typeof parsedBody.ok !== 'boolean') {
    throw new FriendsServiceError('The server returned an invalid response.', {
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
      throw new FriendsServiceError(body.error.message, {
        code: body.error.code,
        details: isFriendErrorDetails(body.error.details)
          ? body.error.details
          : null,
        status: response.status,
      });
    }

    throw new FriendsServiceError('The request could not be completed.', {
      status: response.status,
    });
  }

  return body.data;
}

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  return readApiResponse<T>(await authedFetch(path, init));
}

function postJson<T>(
  path: string,
  body: Record<string, unknown> | undefined,
  signal?: AbortSignal,
): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal,
  });
}

export function fetchFriendsSnapshot(
  signal?: AbortSignal,
): Promise<FriendsSnapshot> {
  return request<FriendsSnapshot>('/api/friends', { signal });
}

export async function searchFriends(
  usernamePrefix: string,
  signal?: AbortSignal,
): Promise<FriendsSearchResult['results']> {
  const payload = await request<FriendsSearchResult>(
    `/api/friends/search?q=${encodeURIComponent(usernamePrefix)}`,
    { signal },
  );
  return payload.results;
}

export function sendFriendRequest(
  addresseeId: string,
  signal?: AbortSignal,
): Promise<FriendMutationResult> {
  return postJson<FriendMutationResult>(
    '/api/friends/request',
    { addressee_id: addresseeId },
    signal,
  );
}

export function acceptFriendRequest(
  connectionId: string,
  signal?: AbortSignal,
): Promise<FriendMutationResult> {
  return postJson<FriendMutationResult>(
    `/api/friends/${encodeURIComponent(connectionId)}/accept`,
    undefined,
    signal,
  );
}

export function declineFriendRequest(
  connectionId: string,
  signal?: AbortSignal,
): Promise<FriendMutationResult> {
  return postJson<FriendMutationResult>(
    `/api/friends/${encodeURIComponent(connectionId)}/decline`,
    undefined,
    signal,
  );
}
