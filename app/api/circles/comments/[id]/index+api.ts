import { withAuth, type AuthContext } from '@/lib/api/auth';
import {
  circlesErrorResponse,
  circlesSuccessResponse,
  circlesUnauthorizedResponse,
} from '@/lib/api/circles';
import { createAuthedClient } from '@/lib/db/client';
import { deletePostComment } from '@/lib/db/circles';
import { validateUuid } from '@/lib/db/circles-core';

// Author soft-delete (sets deleted_at via the column-scoped update grant).
export async function DELETE(
  request: Request,
  params: Record<string, string>,
): Promise<Response> {
  return withAuth(handleDelete, {
    onUnauthorized: circlesUnauthorizedResponse,
  })(request, params);
}

async function handleDelete(
  _request: Request,
  params: Record<string, string>,
  auth: AuthContext,
): Promise<Response> {
  try {
    const id = await deletePostComment(
      validateUuid(params.id, 'comment id'),
      auth.userId,
      createAuthedClient(auth.accessToken),
    );
    return circlesSuccessResponse({ id });
  } catch (error) {
    return circlesErrorResponse(error, 'Failed to delete comment.');
  }
}
