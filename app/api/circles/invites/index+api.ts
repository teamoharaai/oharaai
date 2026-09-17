import { withAuth, type AuthContext } from '@/lib/api/auth';
import {
  circlesErrorResponse,
  circlesSuccessResponse,
  circlesUnauthorizedResponse,
  readCircleRequestBody,
} from '@/lib/api/circles';
import { createAuthedClient } from '@/lib/db/client';
import { listMyGoalInvites, sendGoalInvites } from '@/lib/db/circles';
import { parseInviteeIds, validateUuid } from '@/lib/db/circles-core';

// GET: my incoming (pending) goal invites. POST: send invites for one of my goals.
export async function GET(request: Request): Promise<Response> {
  return withAuth(handleGet, {
    onUnauthorized: circlesUnauthorizedResponse,
  })(request);
}

export async function POST(request: Request): Promise<Response> {
  return withAuth(handlePost, {
    onUnauthorized: circlesUnauthorizedResponse,
  })(request);
}

async function handleGet(
  _request: Request,
  _params: Record<string, string>,
  auth: AuthContext,
): Promise<Response> {
  try {
    const invites = await listMyGoalInvites(
      createAuthedClient(auth.accessToken),
    );
    return circlesSuccessResponse({ invites });
  } catch (error) {
    return circlesErrorResponse(error, 'Failed to load goal invites.');
  }
}

async function handlePost(
  request: Request,
  _params: Record<string, string>,
  auth: AuthContext,
): Promise<Response> {
  try {
    const body = await readCircleRequestBody(request);
    const goalId = validateUuid(
      'goal_id' in body ? body.goal_id : body.goalId,
      'goal_id',
    );
    const inviteeIds = parseInviteeIds(
      'invitee_ids' in body ? body.invitee_ids : body.inviteeIds,
    );
    const ids = await sendGoalInvites(
      goalId,
      inviteeIds,
      createAuthedClient(auth.accessToken),
    );
    return circlesSuccessResponse({ inviteIds: ids }, 201);
  } catch (error) {
    return circlesErrorResponse(error, 'Failed to send goal invites.');
  }
}
