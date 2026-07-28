import {
  withAuth,
  type AuthContext,
} from '../../../../../lib/api/auth.ts';
import {
  constellationErrorResponse,
  constellationSuccessResponse,
  constellationUnauthorizedResponse,
  parseConstellationResourceId,
} from '../../../../../lib/api/constellation.ts';
import { createAuthedClient } from '../../../../../lib/db/client.ts';
import {
  archiveAnnotation,
} from '../../../../../features/constellation/services/constellation-server-service.ts';

export async function POST(
  request: Request,
  params: Record<string, string>,
): Promise<Response> {
  return withAuth(handlePost, {
    onUnauthorized: constellationUnauthorizedResponse,
  })(request, params);
}

async function handlePost(
  _request: Request,
  params: Record<string, string>,
  auth: AuthContext,
): Promise<Response> {
  try {
    const annotation = await archiveAnnotation(
      auth.userId,
      parseConstellationResourceId(params, 'annotation id'),
      createAuthedClient(auth.accessToken),
    );
    return constellationSuccessResponse(annotation);
  } catch (error) {
    return constellationErrorResponse(
      error,
      'Failed to archive annotation.',
    );
  }
}
