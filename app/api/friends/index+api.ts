import { withAuth, type AuthContext } from '@/lib/api/auth';
import {
  friendsErrorResponse,
  friendsSuccessResponse,
  friendsUnauthorizedResponse,
} from '@/lib/api/friends';
import { createAuthedClient } from '@/lib/db/client';
import { getFriendsSnapshot } from '@/lib/db/friends';

export async function GET(request: Request): Promise<Response> {
  return withAuth(handleGet, {
    onUnauthorized: friendsUnauthorizedResponse,
  })(request);
}

async function handleGet(
  _request: Request,
  _params: Record<string, string>,
  auth: AuthContext,
): Promise<Response> {
  try {
    const snapshot = await getFriendsSnapshot(
      auth.userId,
      createAuthedClient(auth.accessToken),
    );
    return friendsSuccessResponse(snapshot);
  } catch (error) {
    return friendsErrorResponse(error, 'Failed to load friends.');
  }
}
