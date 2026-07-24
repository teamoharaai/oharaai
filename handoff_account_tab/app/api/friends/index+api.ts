// GET /api/friends
//
// Returns the caller's accepted friends (hydrated to display fields via
// get_profiles_by_ids) and the public friend_count. The friends list itself is
// NEVER exposed to anyone but its owner — this route reads friend_connections
// directly, whose SELECT policy already restricts rows to the two parties.

import { withAuth, type AuthContext } from '@/lib/api/auth';
import { createAuthedClient } from '@/lib/db/client';
import type { ApiResponse } from '@/lib/api/contracts';
import type { PersonSummary } from '@/features/friends/types';

function unauthorized(): Response {
  const body: ApiResponse<never> = {
    ok: false,
    data: null,
    error: { code: 'UNAUTHORIZED', message: 'Unauthorized' },
  };
  return Response.json(body, { status: 401 });
}

export async function GET(request: Request): Promise<Response> {
  return withAuth(handleGet, { onUnauthorized: unauthorized })(request);
}

interface Payload {
  friends: PersonSummary[];
  friend_count: number;
}

async function handleGet(_request: Request, _params: Record<string, string>, auth: AuthContext): Promise<Response> {
  const db = createAuthedClient(auth.accessToken);

  const { data: rows, error: connErr } = await db
    .from('friend_connections')
    .select('requester_id, addressee_id')
    .eq('status', 'accepted');

  if (connErr) {
    const body: ApiResponse<never> = {
      ok: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to load friends' },
    };
    return Response.json(body, { status: 500 });
  }

  const friendIds = (rows ?? [])
    .map((r) => (r.requester_id === auth.userId ? r.addressee_id : r.requester_id))
    .filter((id): id is string => typeof id === 'string' && id !== auth.userId);

  let friends: PersonSummary[] = [];
  if (friendIds.length > 0) {
    const { data: profiles, error: profErr } = await db.rpc('get_profiles_by_ids', {
      user_ids: friendIds,
    });
    if (profErr) {
      const body: ApiResponse<never> = {
        ok: false,
        data: null,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to hydrate friends' },
      };
      return Response.json(body, { status: 500 });
    }
    friends = (profiles ?? []).map((p: Record<string, unknown>) => ({
      id: p.id as string,
      username: p.username as string,
      display_name: (p.display_name as string) ?? '',
      avatar_url: (p.avatar_url as string | null) ?? null,
    }));
  }

  const body: ApiResponse<Payload> = {
    ok: true,
    data: { friends, friend_count: friends.length },
    error: null,
  };
  return Response.json(body, { status: 200 });
}
