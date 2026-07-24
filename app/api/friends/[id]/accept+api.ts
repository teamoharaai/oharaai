import { withAuth, type AuthContext } from '@/lib/api/auth';
import {
  friendsErrorResponse,
  friendsSuccessResponse,
  friendsUnauthorizedResponse,
  parseConnectionId,
} from '@/lib/api/friends';
import { createAuthedClient } from '@/lib/db/client';
import { respondToFriendRequest } from '@/lib/db/friends';
import type { FriendMutationResult } from '@/features/friends/types';

export async function POST(
  request: Request,
  params: Record<string, string>,
): Promise<Response> {
  return withAuth(handlePost, {
    onUnauthorized: friendsUnauthorizedResponse,
  })(request, params);
}

async function handlePost(
  _request: Request,
  params: Record<string, string>,
  auth: AuthContext,
): Promise<Response> {
  try {
    const id = await respondToFriendRequest(
      parseConnectionId(params),
      auth.userId,
      'accepted',
      createAuthedClient(auth.accessToken),
    );
    const data: FriendMutationResult = { id };
    return friendsSuccessResponse(data);
  } catch (error) {
    return friendsErrorResponse(error, 'Failed to accept friend request.');
  }
}
