import { withAuth, type AuthContext } from '@/lib/api/auth';
import {
  circlesErrorResponse,
  circlesSuccessResponse,
  circlesUnauthorizedResponse,
  readCircleRequestBody,
} from '@/lib/api/circles';
import { createAuthedClient } from '@/lib/db/client';
import { getMyPublicGoal, setPublicGoal } from '@/lib/db/circles';
import { parsePublicGoalId } from '@/lib/db/circles-core';

export async function GET(request: Request): Promise<Response> {
  return withAuth(handleGet, {
    onUnauthorized: circlesUnauthorizedResponse,
  })(request);
}

export async function PUT(request: Request): Promise<Response> {
  return withAuth(handlePut, {
    onUnauthorized: circlesUnauthorizedResponse,
  })(request);
}

async function handleGet(
  _request: Request,
  _params: Record<string, string>,
  auth: AuthContext,
): Promise<Response> {
  try {
    const goal = await getMyPublicGoal(
      auth.userId,
      createAuthedClient(auth.accessToken),
    );
    return circlesSuccessResponse({ goal });
  } catch (error) {
    return circlesErrorResponse(error, 'Failed to load public goal.');
  }
}

async function handlePut(
  request: Request,
  _params: Record<string, string>,
  auth: AuthContext,
): Promise<Response> {
  try {
    const body = await readCircleRequestBody(request);
    // Accept { goal_id } or { goalId }; null explicitly clears the public goal.
    const raw = 'goal_id' in body ? body.goal_id : body.goalId;
    const goalId = parsePublicGoalId(raw ?? null);
    const id = await setPublicGoal(goalId, createAuthedClient(auth.accessToken));
    return circlesSuccessResponse({ id });
  } catch (error) {
    return circlesErrorResponse(error, 'Failed to update public goal.');
  }
}
