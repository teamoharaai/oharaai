import {
  withAuth,
  type AuthContext,
} from '../../../../lib/api/auth.ts';
import {
  constellationErrorResponse,
  constellationSuccessResponse,
  constellationUnauthorizedResponse,
  parseConstellationResourceId,
  parseUpdateEvidenceReferenceRequest,
} from '../../../../lib/api/constellation.ts';
import { createAuthedClient } from '../../../../lib/db/client.ts';
import {
  editConstellationEvidenceReference,
  removeConstellationEvidenceReference,
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
    const evidenceReference = await editConstellationEvidenceReference(
      auth.userId,
      parseConstellationResourceId(params, 'evidence-reference id'),
      await parseUpdateEvidenceReferenceRequest(request),
      createAuthedClient(auth.accessToken),
    );
    return constellationSuccessResponse(evidenceReference);
  } catch (error) {
    return constellationErrorResponse(
      error,
      'Failed to update evidence reference.',
    );
  }
}

async function handleDelete(
  _request: Request,
  params: Record<string, string>,
  auth: AuthContext,
): Promise<Response> {
  try {
    const result = await removeConstellationEvidenceReference(
      auth.userId,
      parseConstellationResourceId(params, 'evidence-reference id'),
      createAuthedClient(auth.accessToken),
    );
    return constellationSuccessResponse(result);
  } catch (error) {
    return constellationErrorResponse(
      error,
      'Failed to delete evidence reference.',
    );
  }
}
