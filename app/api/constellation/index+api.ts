import {
  withAuth,
  type AuthContext,
} from '../../../lib/api/auth.ts';
import {
  constellationErrorResponse,
  constellationUnauthorizedResponse,
} from '../../../lib/api/constellation.ts';
import { createAuthedClient } from '../../../lib/db/client.ts';
import {
  getConstellationGraph,
} from '../../../features/constellation/services/constellation-server-service.ts';

export async function GET(request: Request): Promise<Response> {
  return withAuth(handleGet, {
    onUnauthorized: constellationUnauthorizedResponse,
  })(request);
}

async function handleGet(
  _request: Request,
  _params: Record<string, string>,
  auth: AuthContext,
): Promise<Response> {
  try {
    const graph = await getConstellationGraph(
      auth.userId,
      createAuthedClient(auth.accessToken),
    );
    return Response.json(graph);
  } catch (error) {
    return constellationErrorResponse(
      error,
      'Failed to load Constellation.',
    );
  }
}
