import {
  withAuth,
  type AuthContext,
} from '../../../../lib/api/auth.ts';
import {
  constellationErrorResponse,
  constellationSuccessResponse,
  constellationUnauthorizedResponse,
  parseCreateGoalLinkRequest,
} from '../../../../lib/api/constellation.ts';
import { createAuthedClient } from '../../../../lib/db/client.ts';
import {
  addConstellationGoalLink,
} from '../../../../features/constellation/services/constellation-server-service.ts';

export async function POST(request: Request): Promise<Response> {
  return withAuth(handlePost, {
    onUnauthorized: constellationUnauthorizedResponse,
  })(request);
}

async function handlePost(
  request: Request,
  _params: Record<string, string>,
  auth: AuthContext,
): Promise<Response> {
  try {
    const goalLink = await addConstellationGoalLink(
      auth.userId,
      await parseCreateGoalLinkRequest(request),
      createAuthedClient(auth.accessToken),
    );
    return constellationSuccessResponse(goalLink, 201);
  } catch (error) {
    return constellationErrorResponse(
      error,
      'Failed to create goal link.',
    );
  }
}
