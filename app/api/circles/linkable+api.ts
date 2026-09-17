import { withAuth, type AuthContext } from '@/lib/api/auth';
import {
  circlesErrorResponse,
  circlesSuccessResponse,
  circlesUnauthorizedResponse,
} from '@/lib/api/circles';
import { createAuthedClient } from '@/lib/db/client';
import { getLinkableItems } from '@/lib/db/circles';

// The post composer's picker: the caller's own shareable goals, completed
// milestones, and reflection entries — title + a suggested description only.
export async function GET(request: Request): Promise<Response> {
  return withAuth(handleGet, {
    onUnauthorized: circlesUnauthorizedResponse,
  })(request);
}

async function handleGet(
  _request: Request,
  _params: Record<string, string>,
  auth: AuthContext,
): Promise<Response> {
  try {
    const items = await getLinkableItems(
      auth.userId,
      createAuthedClient(auth.accessToken),
    );
    return circlesSuccessResponse(items);
  } catch (error) {
    return circlesErrorResponse(error, 'Failed to load linkable items.');
  }
}
