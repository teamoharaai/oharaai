import { withAuth, type AuthContext } from '@/lib/api/auth';
import {
  circlesErrorResponse,
  circlesSuccessResponse,
  circlesUnauthorizedResponse,
} from '@/lib/api/circles';
import { createAuthedClient } from '@/lib/db/client';
import { savePost, unsavePost } from '@/lib/db/circles';
import { validateUuid } from '@/lib/db/circles-core';

export async function POST(
  request: Request,
  params: Record<string, string>,
): Promise<Response> {
  return withAuth(handlePost, {
    onUnauthorized: circlesUnauthorizedResponse,
  })(request, params);
}

export async function DELETE(
  request: Request,
  params: Record<string, string>,
): Promise<Response> {
  return withAuth(handleDelete, {
    onUnauthorized: circlesUnauthorizedResponse,
  })(request, params);
}

async function handlePost(
  _request: Request,
  params: Record<string, string>,
  auth: AuthContext,
): Promise<Response> {
  try {
    const postId = validateUuid(params.id, 'post id');
    await savePost(postId, auth.userId, createAuthedClient(auth.accessToken));
    return circlesSuccessResponse({ postId, saved: true });
  } catch (error) {
    return circlesErrorResponse(error, 'Failed to save post.');
  }
}

async function handleDelete(
  _request: Request,
  params: Record<string, string>,
  auth: AuthContext,
): Promise<Response> {
  try {
    const postId = validateUuid(params.id, 'post id');
    await unsavePost(postId, auth.userId, createAuthedClient(auth.accessToken));
    return circlesSuccessResponse({ postId, saved: false });
  } catch (error) {
    return circlesErrorResponse(error, 'Failed to unsave post.');
  }
}
