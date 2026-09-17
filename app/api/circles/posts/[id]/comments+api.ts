import { withAuth, type AuthContext } from '@/lib/api/auth';
import {
  circlesErrorResponse,
  circlesSuccessResponse,
  circlesUnauthorizedResponse,
  readCircleRequestBody,
} from '@/lib/api/circles';
import { createAuthedClient } from '@/lib/db/client';
import { createPostComment, listPostComments } from '@/lib/db/circles';
import { validateCommentBody, validateUuid } from '@/lib/db/circles-core';

export async function GET(
  request: Request,
  params: Record<string, string>,
): Promise<Response> {
  return withAuth(handleGet, {
    onUnauthorized: circlesUnauthorizedResponse,
  })(request, params);
}

export async function POST(
  request: Request,
  params: Record<string, string>,
): Promise<Response> {
  return withAuth(handlePost, {
    onUnauthorized: circlesUnauthorizedResponse,
  })(request, params);
}

async function handleGet(
  _request: Request,
  params: Record<string, string>,
  auth: AuthContext,
): Promise<Response> {
  try {
    const comments = await listPostComments(
      validateUuid(params.id, 'post id'),
      createAuthedClient(auth.accessToken),
    );
    return circlesSuccessResponse({ comments });
  } catch (error) {
    return circlesErrorResponse(error, 'Failed to load comments.');
  }
}

async function handlePost(
  request: Request,
  params: Record<string, string>,
  auth: AuthContext,
): Promise<Response> {
  try {
    const postId = validateUuid(params.id, 'post id');
    const body = await readCircleRequestBody(request);
    const id = await createPostComment(
      postId,
      auth.userId,
      validateCommentBody(body.body),
      createAuthedClient(auth.accessToken),
    );
    return circlesSuccessResponse({ id }, 201);
  } catch (error) {
    return circlesErrorResponse(error, 'Failed to add comment.');
  }
}
