import {
  withAuth,
  type AuthContext,
} from '../../../../../../lib/api/auth.ts';
import {
  constellationErrorResponse,
  constellationSuccessResponse,
  constellationUnauthorizedResponse,
  parseConstellationBrtCategory,
  parseConstellationResourceId,
} from '../../../../../../lib/api/constellation.ts';
import { createAuthedClient } from '../../../../../../lib/db/client.ts';
import {
  getConstellationBrtInspector,
} from '../../../../../../features/constellation/services/constellation-server-service.ts';

export async function GET(
  request: Request,
  params: Record<string, string>,
): Promise<Response> {
  return withAuth(handleGet, {
    onUnauthorized: constellationUnauthorizedResponse,
  })(request, params);
}

async function handleGet(
  _request: Request,
  params: Record<string, string>,
  auth: AuthContext,
): Promise<Response> {
  try {
    const inspector = await getConstellationBrtInspector(
      auth.userId,
      parseConstellationResourceId(params, 'goal id'),
      parseConstellationBrtCategory(params.category),
      createAuthedClient(auth.accessToken),
    );
    return constellationSuccessResponse(inspector);
  } catch (error) {
    return constellationErrorResponse(
      error,
      'Failed to load goal BRT entries.',
    );
  }
}
