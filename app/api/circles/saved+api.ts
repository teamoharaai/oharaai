import { withAuth, type AuthContext } from '@/lib/api/auth';
import {
  circlesErrorResponse,
  circlesSuccessResponse,
  circlesUnauthorizedResponse,
} from '@/lib/api/circles';
import { createAuthedClient } from '@/lib/db/client';
import { listSavedPosts } from '@/lib/db/circles';

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
    const saved = await listSavedPosts(createAuthedClient(auth.accessToken));
    return circlesSuccessResponse({ saved });
  } catch (error) {
    return circlesErrorResponse(error, 'Failed to load saved posts.');
  }
}
