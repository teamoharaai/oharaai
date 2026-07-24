// POST /api/friends/request  { addressee_id: string }
//
// Creates a pending friend_connections row. The RLS "Users can send friend
// requests" policy already restricts requester_id to auth.uid(), and the
// friend_connections_unique_pair index blocks duplicate pending/accepted edges
// in either direction — this route surfaces those as clean 409s.

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

interface Body {
  addressee_id?: unknown;
}

export async function POST(request: Request): Promise<Response> {
  return withAuth(handlePost, { onUnauthorized: unauthorized })(request);
}

async function handlePost(request: Request, _params: Record<string, string>, auth: AuthContext): Promise<Response> {
  let payload: Body;
  try {
    payload = (await request.json()) as Body;
  } catch {
    const body: ApiResponse<never> = {
      ok: false,
      data: null,
      error: { code: 'INVALID_INPUT', message: 'Invalid JSON body' },
    };
    return Response.json(body, { status: 400 });
  }

  const addresseeId = typeof payload.addressee_id === 'string' ? payload.addressee_id.trim() : '';
  if (!addresseeId) {
    const body: ApiResponse<never> = {
      ok: false,
      data: null,
      error: { code: 'INVALID_INPUT', message: 'addressee_id is required' },
    };
    return Response.json(body, { status: 400 });
  }
  if (addresseeId === auth.userId) {
    const body: ApiResponse<never> = {
      ok: false,
      data: null,
      error: { code: 'INVALID_INPUT', message: "You can't send a request to yourself." },
    };
    return Response.json(body, { status: 400 });
  }

  const db = createAuthedClient(auth.accessToken);
  const { data, error } = await db
    .from('friend_connections')
    .insert({ requester_id: auth.userId, addressee_id: addresseeId, status: 'pending' })
    .select('id')
    .single();

  if (error || !data) {
    const isDuplicate = error?.code === '23505';
    const body: ApiResponse<never> = {
      ok: false,
      data: null,
      error: isDuplicate
        ? { code: 'ALREADY_CONNECTED', message: 'A request already exists between you two.' }
        : { code: 'INTERNAL_ERROR', message: error?.message ?? 'Failed to send request' },
    };
    return Response.json(body, { status: isDuplicate ? 409 : 500 });
  }

  const body: ApiResponse<{ id: string }> = {
    ok: true,
    data: { id: data.id as string },
    error: null,
  };
  return Response.json(body, { status: 201 });
}
