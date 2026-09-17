import { withAuth, type AuthContext } from '@/lib/api/auth';
import {
  circlesErrorResponse,
  circlesSuccessResponse,
  circlesUnauthorizedResponse,
  readCircleRequestBody,
} from '@/lib/api/circles';
import { createAuthedClient } from '@/lib/db/client';
import { respondToGoalInvite } from '@/lib/db/circles';
import { validateInviteResponse, validateUuid } from '@/lib/db/circles-core';

// Invitee accepts or declines a pending goal invite.
export async function POST(
  request: Request,
  params: Record<string, string>,
): Promise<Response> {
  return withAuth(handlePost, {
    onUnauthorized: circlesUnauthorizedResponse,
  })(request, params);
}

async function handlePost(
  request: Request,
  params: Record<string, string>,
  auth: AuthContext,
): Promise<Response> {
  try {
    const inviteId = validateUuid(params.id, 'invite id');
    const body = await readCircleRequestBody(request);
    const response = validateInviteResponse(body.response);
    const id = await respondToGoalInvite(
      inviteId,
      response,
      createAuthedClient(auth.accessToken),
    );
    return circlesSuccessResponse({ id });
  } catch (error) {
    return circlesErrorResponse(error, 'Failed to respond to invite.');
  }
}
