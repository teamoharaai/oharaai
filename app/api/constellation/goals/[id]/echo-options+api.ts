import {
  withAuth,
  type AuthContext,
} from '../../../../../lib/api/auth.ts';
import {
  constellationErrorResponse,
  constellationSuccessResponse,
  constellationUnauthorizedResponse,
  parseConstellationEchoSearchQuery,
  parseConstellationResourceId,
} from '../../../../../lib/api/constellation.ts';
import { createAuthedClient } from '../../../../../lib/db/client.ts';
import {
  getConstellationEchoOptions,
} from '../../../../../features/constellation/services/constellation-server-service.ts';

export async function GET(
  request: Request,
  params: Record<string, string>,
): Promise<Response> {
  return withAuth(handleGet, {
    onUnauthorized: constellationUnauthorizedResponse,
  })(request, params);
}

async function handleGet(
  request: Request,
  params: Record<string, string>,
  auth: AuthContext,
): Promise<Response> {
  try {
    const result = await getConstellationEchoOptions(
      auth.userId,
      parseConstellationResourceId(params, 'goal id'),
      parseConstellationEchoSearchQuery(request),
      createAuthedClient(auth.accessToken),
    );
    return constellationSuccessResponse(result);
  } catch (error) {
    return constellationErrorResponse(
      error,
      'Failed to search entries.',
    );
  }
}
