// POST /api/friends/[id]/accept
//
// Flips a pending friend_connections row to 'accepted'. RLS "Addressee can
// respond to pending requests" already restricts this to the addressee while
// the row is still pending, so a requester or bystander can't self-accept.

import { withAuth, type AuthContext } from '@/lib/api/auth';
import { createAuthedClient } from '@/lib/db/client';
import type { ApiResponse } from '@/lib/api/contracts';

function unauthorized(): Response {
  const body: ApiResponse<never> = {
    ok: false,
    data: null,
    error: { code: 'UNAUTHORIZED', message: 'Unauthorized' },
  };
  return Response.json(body, { status: 401 });
}

export async function POST(request: Request): Promise<Response> {
  return withAuth(handlePost, { onUnauthorized: unauthorized })(request);
}

async function handlePost(_request: Request, params: Record<string, string>, auth: AuthContext): Promise<Response> {
  const connectionId = params.id;
  if (!connectionId) {
    const body: ApiResponse<never> = {
      ok: false,
      data: null,
      error: { code: 'INVALID_INPUT', message: 'connection id is required' },
    };
    return Response.json(body, { status: 400 });
  }

  const db = createAuthedClient(auth.accessToken);
  const { data, error } = await db
    .from('friend_connections')
    .update({ status: 'accepted', responded_at: new Date().toISOString() })
    .eq('id', connectionId)
    .select('id')
    .single();

  if (error || !data) {
    // Row-not-updated by RLS looks the same as not-found from here; both are 404.
    const body: ApiResponse<never> = {
      ok: false,
      data: null,
      error: { code: 'NOT_FOUND', message: 'Request not found or already handled' },
    };
    return Response.json(body, { status: 404 });
  }

  const body: ApiResponse<{ id: string }> = {
    ok: true,
    data: { id: data.id as string },
    error: null,
  };
  return Response.json(body, { status: 200 });
}
