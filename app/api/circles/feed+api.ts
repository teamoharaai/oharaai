import { withAuth, type AuthContext } from '@/lib/api/auth';
import {
  circlesErrorResponse,
  circlesSuccessResponse,
  circlesUnauthorizedResponse,
} from '@/lib/api/circles';
import { createAuthedClient } from '@/lib/db/client';
import { getCirclesFeed } from '@/lib/db/circles';
import { CircleDataError } from '@/lib/db/circles-core';

export async function GET(request: Request): Promise<Response> {
  return withAuth(handleGet, {
    onUnauthorized: circlesUnauthorizedResponse,
  })(request);
}

async function handleGet(
  request: Request,
  _params: Record<string, string>,
  auth: AuthContext,
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const beforeParam = url.searchParams.get('before');
    if (beforeParam && Number.isNaN(Date.parse(beforeParam))) {
      throw new CircleDataError('INVALID_INPUT', 'before must be an ISO timestamp.');
    }
    const limitParam = url.searchParams.get('limit');
    const limit = limitParam ? Number.parseInt(limitParam, 10) : undefined;
    if (limit !== undefined && !Number.isFinite(limit)) {
      throw new CircleDataError('INVALID_INPUT', 'limit must be a number.');
    }

    const posts = await getCirclesFeed(
      { before: beforeParam, limit },
      createAuthedClient(auth.accessToken),
    );
    return circlesSuccessResponse({ posts });
  } catch (error) {
    return circlesErrorResponse(error, 'Failed to load feed.');
  }
}
