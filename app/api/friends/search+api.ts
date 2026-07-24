import { withAuth, type AuthContext } from '@/lib/api/auth';
import {
  friendsErrorResponse,
  friendsSuccessResponse,
  friendsUnauthorizedResponse,
  parseUsernamePrefix,
} from '@/lib/api/friends';
import { createAuthedClient } from '@/lib/db/client';
import { searchFriendsByUsername } from '@/lib/db/friends';
import type { FriendsSearchResult } from '@/features/friends/types';

export async function GET(request: Request): Promise<Response> {
  return withAuth(handleGet, {
    onUnauthorized: friendsUnauthorizedResponse,
  })(request);
}

async function handleGet(
  request: Request,
  _params: Record<string, string>,
  auth: AuthContext,
): Promise<Response> {
  try {
    const results = await searchFriendsByUsername(
      parseUsernamePrefix(request),
      auth.userId,
      createAuthedClient(auth.accessToken),
    );
    const data: FriendsSearchResult = { results };
    return friendsSuccessResponse(data);
  } catch (error) {
    return friendsErrorResponse(error, 'Failed to search for people.');
  }
}
