import {
  withAuth,
  type AuthContext,
} from '../../../../lib/api/auth.ts';
import {
  constellationErrorResponse,
  constellationSuccessResponse,
  constellationUnauthorizedResponse,
  parseSaveConstellationLayoutPositionRequest,
} from '../../../../lib/api/constellation.ts';
import { createAuthedClient } from '../../../../lib/db/client.ts';
import {
  getConstellationLayout,
  resetConstellationLayout,
  saveConstellationLayoutPosition,
} from '../../../../features/constellation/services/constellation-server-service.ts';

export async function GET(request: Request): Promise<Response> {
  return withAuth(handleGet, {
    onUnauthorized: constellationUnauthorizedResponse,
  })(request);
}

export async function PATCH(request: Request): Promise<Response> {
  return withAuth(handlePatch, {
    onUnauthorized: constellationUnauthorizedResponse,
  })(request);
}

export async function DELETE(request: Request): Promise<Response> {
  return withAuth(handleDelete, {
    onUnauthorized: constellationUnauthorizedResponse,
  })(request);
}

async function handleGet(
  _request: Request,
  _params: Record<string, string>,
  auth: AuthContext,
): Promise<Response> {
  try {
    return constellationSuccessResponse(
      await getConstellationLayout(
        auth.userId,
        createAuthedClient(auth.accessToken),
      ),
    );
  } catch (error) {
    return constellationErrorResponse(
      error,
      'Failed to load Constellation layout.',
    );
  }
}

async function handlePatch(
  request: Request,
  _params: Record<string, string>,
  auth: AuthContext,
): Promise<Response> {
  try {
    return constellationSuccessResponse(
      await saveConstellationLayoutPosition(
        auth.userId,
        await parseSaveConstellationLayoutPositionRequest(request),
        createAuthedClient(auth.accessToken),
      ),
    );
  } catch (error) {
    return constellationErrorResponse(
      error,
      'Failed to save Constellation layout.',
    );
  }
}

async function handleDelete(
  _request: Request,
  _params: Record<string, string>,
  auth: AuthContext,
): Promise<Response> {
  try {
    await resetConstellationLayout(
      auth.userId,
      createAuthedClient(auth.accessToken),
    );
    return constellationSuccessResponse({ reset: true });
  } catch (error) {
    return constellationErrorResponse(
      error,
      'Failed to reset Constellation layout.',
    );
  }
}
