import {
  withAuth,
  type AuthContext,
} from '../../../../lib/api/auth.ts';
import {
  constellationErrorResponse,
  constellationSuccessResponse,
  constellationUnauthorizedResponse,
  parseConstellationResourceId,
  parseUpdateAnnotationRequest,
} from '../../../../lib/api/constellation.ts';
import { createAuthedClient } from '../../../../lib/db/client.ts';
import {
  editConstellationAnnotation,
} from '../../../../features/constellation/services/constellation-server-service.ts';

export async function PATCH(
  request: Request,
  params: Record<string, string>,
): Promise<Response> {
  return withAuth(handlePatch, {
    onUnauthorized: constellationUnauthorizedResponse,
  })(request, params);
}

async function handlePatch(
  request: Request,
  params: Record<string, string>,
  auth: AuthContext,
): Promise<Response> {
  try {
    const annotation = await editConstellationAnnotation(
      auth.userId,
      parseConstellationResourceId(params, 'annotation id'),
      await parseUpdateAnnotationRequest(request),
      createAuthedClient(auth.accessToken),
    );
    return constellationSuccessResponse(annotation);
  } catch (error) {
    return constellationErrorResponse(
      error,
      'Failed to update annotation.',
    );
  }
}
