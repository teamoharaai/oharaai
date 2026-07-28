import {
  withAuth,
  type AuthContext,
} from '../../../../lib/api/auth.ts';
import {
  constellationErrorResponse,
  constellationSuccessResponse,
  constellationUnauthorizedResponse,
  parseConstellationResourceId,
} from '../../../../lib/api/constellation.ts';
import { createAuthedClient } from '../../../../lib/db/client.ts';
import {
  getConstellationReflectionInspector,
} from '../../../../features/constellation/services/constellation-server-service.ts';

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
    const reflection = await getConstellationReflectionInspector(
      auth.userId,
      parseConstellationResourceId(params, 'reflection id'),
      createAuthedClient(auth.accessToken),
    );
    return constellationSuccessResponse(reflection);
  } catch (error) {
    return constellationErrorResponse(
      error,
      'Failed to load Reflection details.',
    );
  }
}
