import {
  withAuth,
  type AuthContext,
} from '../../../../lib/api/auth.ts';
import {
  constellationErrorResponse,
  constellationSuccessResponse,
  constellationUnauthorizedResponse,
  parseCreateAnnotationRequest,
} from '../../../../lib/api/constellation.ts';
import { createAuthedClient } from '../../../../lib/db/client.ts';
import {
  addConstellationAnnotation,
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
    const annotation = await addConstellationAnnotation(
      auth.userId,
      await parseCreateAnnotationRequest(request),
      createAuthedClient(auth.accessToken),
    );
    return constellationSuccessResponse(annotation, 201);
  } catch (error) {
    return constellationErrorResponse(
      error,
      'Failed to create annotation.',
    );
  }
}
