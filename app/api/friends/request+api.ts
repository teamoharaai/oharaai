import { withAuth, type AuthContext } from '@/lib/api/auth';
import {
  friendsErrorResponse,
  friendsSuccessResponse,
  friendsUnauthorizedResponse,
  parseAddresseeId,
  readFriendRequestBody,
} from '@/lib/api/friends';
import { createAuthedClient } from '@/lib/db/client';
import { sendFriendRequest } from '@/lib/db/friends';
import type { FriendMutationResult } from '@/features/friends/types';

export async function POST(request: Request): Promise<Response> {
  return withAuth(handlePost, {
    onUnauthorized: friendsUnauthorizedResponse,
  })(request);
}

async function handlePost(
  request: Request,
  _params: Record<string, string>,
  auth: AuthContext,
): Promise<Response> {
  try {
    const body = await readFriendRequestBody(request);
    const id = await sendFriendRequest(
      parseAddresseeId(body, auth.userId),
      auth.userId,
      createAuthedClient(auth.accessToken),
    );
    const data: FriendMutationResult = { id };
    return friendsSuccessResponse(data);
  } catch (error) {
    return friendsErrorResponse(error, 'Failed to send friend request.');
  }
}
