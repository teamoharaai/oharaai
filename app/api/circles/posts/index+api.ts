import { withAuth, type AuthContext } from '@/lib/api/auth';
import {
  circlesErrorResponse,
  circlesSuccessResponse,
  circlesUnauthorizedResponse,
  readCircleRequestBody,
} from '@/lib/api/circles';
import { createAuthedClient } from '@/lib/db/client';
import { createCirclePost } from '@/lib/db/circles';
import { parseCreatePostInput } from '@/lib/db/circles-core';

export async function POST(request: Request): Promise<Response> {
  return withAuth(handlePost, {
    onUnauthorized: circlesUnauthorizedResponse,
  })(request);
}

async function handlePost(
  request: Request,
  _params: Record<string, string>,
  auth: AuthContext,
): Promise<Response> {
  try {
    const body = await readCircleRequestBody(request);
    const id = await createCirclePost(
      parseCreatePostInput(body),
      createAuthedClient(auth.accessToken),
    );
    return circlesSuccessResponse({ id }, 201);
  } catch (error) {
    return circlesErrorResponse(error, 'Failed to create post.');
  }
}
