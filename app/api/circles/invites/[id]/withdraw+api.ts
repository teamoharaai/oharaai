import { withAuth, type AuthContext } from '@/lib/api/auth';
import {
  circlesErrorResponse,
  circlesSuccessResponse,
  circlesUnauthorizedResponse,
} from '@/lib/api/circles';
import { createAuthedClient } from '@/lib/db/client';
import { withdrawGoalInvite } from '@/lib/db/circles';
import { validateUuid } from '@/lib/db/circles-core';

// Owner withdraws a pending invite or revokes an accepted one.
export async function POST(
  request: Request,
  params: Record<string, string>,
): Promise<Response> {
  return withAuth(handlePost, {
    onUnauthorized: circlesUnauthorizedResponse,
  })(request, params);
}

async function handlePost(
  _request: Request,
  params: Record<string, string>,
  auth: AuthContext,
): Promise<Response> {
  try {
    const id = await withdrawGoalInvite(
      validateUuid(params.id, 'invite id'),
      createAuthedClient(auth.accessToken),
    );
    return circlesSuccessResponse({ id });
  } catch (error) {
    return circlesErrorResponse(error, 'Failed to withdraw invite.');
  }
}
