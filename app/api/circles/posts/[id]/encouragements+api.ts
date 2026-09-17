import { withAuth, type AuthContext } from '@/lib/api/auth';
import {
  circlesErrorResponse,
  circlesSuccessResponse,
  circlesUnauthorizedResponse,
} from '@/lib/api/circles';
import { createAuthedClient } from '@/lib/db/client';
import { listPostEncouragers } from '@/lib/db/circles';
import { validateUuid } from '@/lib/db/circles-core';

// CD-013: reveal *who* encouraged a post (friend profiles), not just the count.
export async function GET(
  request: Request,
  params: Record<string, string>,
): Promise<Response> {
  return withAuth(handleGet, {
    onUnauthorized: circlesUnauthorizedResponse,
  })(request, params);
}

async function handleGet(
  _request: Request,
  params: Record<string, string>,
  auth: AuthContext,
): Promise<Response> {
  try {
    const encouragers = await listPostEncouragers(
      validateUuid(params.id, 'post id'),
      createAuthedClient(auth.accessToken),
    );
    return circlesSuccessResponse({ encouragers });
  } catch (error) {
    return circlesErrorResponse(error, 'Failed to load encouragers.');
  }
}
