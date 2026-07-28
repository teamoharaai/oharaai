import {
  withAuth,
  type AuthContext,
} from '../../../../lib/api/auth.ts';
import {
  constellationErrorResponse,
  constellationSuccessResponse,
  constellationUnauthorizedResponse,
  parseCreateEvidenceReferenceRequest,
} from '../../../../lib/api/constellation.ts';
import { createAuthedClient } from '../../../../lib/db/client.ts';
import {
  addOrUpdateConstellationEvidenceReference,
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
    const result = await addOrUpdateConstellationEvidenceReference(
      auth.userId,
      await parseCreateEvidenceReferenceRequest(request),
      createAuthedClient(auth.accessToken),
    );
    return constellationSuccessResponse(
      result.evidenceReference,
      result.created ? 201 : 200,
    );
  } catch (error) {
    return constellationErrorResponse(
      error,
      'Failed to create evidence reference.',
    );
  }
}
