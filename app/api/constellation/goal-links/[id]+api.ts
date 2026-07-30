import {
  withAuth,
  type AuthContext,
} from '../../../../lib/api/auth.ts';
import {
  constellationErrorResponse,
  constellationSuccessResponse,
  constellationUnauthorizedResponse,
  parseConstellationResourceId,
  parseUpdateGoalLinkRequest,
} from '../../../../lib/api/constellation.ts';
import { createAuthedClient } from '../../../../lib/db/client.ts';
import {
  editConstellationGoalLink,
  removeConstellationGoalLink,
} from '../../../../features/constellation/services/constellation-server-service.ts';

export async function PATCH(
  request: Request,
  params: Record<string, string>,
): Promise<Response> {
  return withAuth(handlePatch, {
    onUnauthorized: constellationUnauthorizedResponse,
  })(request, params);
}

export async function DELETE(
  request: Request,
  params: Record<string, string>,
): Promise<Response> {
  return withAuth(handleDelete, {
    onUnauthorized: constellationUnauthorizedResponse,
  })(request, params);
}

async function handlePatch(
  request: Request,
  params: Record<string, string>,
  auth: AuthContext,
): Promise<Response> {
  try {
    const goalLink = await editConstellationGoalLink(
      auth.userId,
      parseConstellationResourceId(params, 'goal-link id'),
      await parseUpdateGoalLinkRequest(request),
      createAuthedClient(auth.accessToken),
    );
    return constellationSuccessResponse(goalLink);
  } catch (error) {
    return constellationErrorResponse(
      error,
      'Failed to update goal link.',
    );
  }
}

async function handleDelete(
  _request: Request,
  params: Record<string, string>,
  auth: AuthContext,
): Promise<Response> {
  try {
    const result = await removeConstellationGoalLink(
      auth.userId,
      parseConstellationResourceId(params, 'goal-link id'),
      createAuthedClient(auth.accessToken),
    );
    return constellationSuccessResponse(result);
  } catch (error) {
    return constellationErrorResponse(
      error,
      'Failed to delete goal link.',
    );
  }
}
