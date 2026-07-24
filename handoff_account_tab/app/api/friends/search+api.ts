// GET /api/friends/search?q=<username>
//
// Wraps search_profiles_by_username (3-char minimum enforced in the RPC) and
// annotates each hit with its relation to the caller so the UI renders the
// right action pill (Add / Pending / Friends / You).

import { withAuth, type AuthContext } from '@/lib/api/auth';
import { createAuthedClient } from '@/lib/db/client';
import type { ApiResponse } from '@/lib/api/contracts';
import type { SearchResult } from '@/features/friends/types';

function unauthorized(): Response {
  const body: ApiResponse<never> = {
    ok: false,
    data: null,
    error: { code: 'UNAUTHORIZED', message: 'Unauthorized' },
  };
  return Response.json(body, { status: 401 });
}

interface Payload {
  results: SearchResult[];
}

export async function GET(request: Request): Promise<Response> {
  return withAuth(handleGet, { onUnauthorized: unauthorized })(request);
}

async function handleGet(request: Request, _params: Record<string, string>, auth: AuthContext): Promise<Response> {
  const url = new URL(request.url);
  const q = (url.searchParams.get('q') ?? '').trim();

  if (q.length < 3) {
    const body: ApiResponse<never> = {
      ok: false,
      data: null,
      error: { code: 'INVALID_INPUT', message: 'Search query must be at least 3 characters.' },
    };
    return Response.json(body, { status: 400 });
  }

  const db = createAuthedClient(auth.accessToken);

  const { data: rows, error: searchErr } = await db.rpc('search_profiles_by_username', { query: q });
  if (searchErr) {
    const body: ApiResponse<never> = {
      ok: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: searchErr.message },
    };
    return Response.json(body, { status: 500 });
  }

  const hits = (rows ?? []) as Array<Record<string, unknown>>;
  const hitIds = hits.map((r) => r.id as string);

  let relationById: Record<string, SearchResult['relation']> = {};
  if (hitIds.length > 0) {
    // One query pulls every live edge between the caller and each hit; RLS keeps
    // this scoped because the caller is one of the two parties on every row.
    const { data: edges, error: edgeErr } = await db
      .from('friend_connections')
      .select('requester_id, addressee_id, status')
      .in('status', ['pending', 'accepted'])
      .or(
        `and(requester_id.eq.${auth.userId},addressee_id.in.(${hitIds.join(',')})),and(addressee_id.eq.${auth.userId},requester_id.in.(${hitIds.join(',')}))`,
      );

    if (edgeErr) {
      const body: ApiResponse<never> = {
        ok: false,
        data: null,
        error: { code: 'INTERNAL_ERROR', message: edgeErr.message },
      };
      return Response.json(body, { status: 500 });
    }

    for (const e of edges ?? []) {
      const otherId =
        (e.requester_id as string) === auth.userId
          ? (e.addressee_id as string)
          : (e.requester_id as string);
      if (e.status === 'accepted') relationById[otherId] = 'friends';
      else if ((e.requester_id as string) === auth.userId) relationById[otherId] = 'pending_out';
      else relationById[otherId] = 'pending_in';
    }
  }

  const results: SearchResult[] = hits.map((r) => {
    const id = r.id as string;
    const relation: SearchResult['relation'] =
      id === auth.userId ? 'self' : relationById[id] ?? 'none';
    return {
      id,
      username: r.username as string,
      display_name: (r.display_name as string) ?? '',
      avatar_url: (r.avatar_url as string | null) ?? null,
      relation,
    };
  });

  const body: ApiResponse<Payload> = { ok: true, data: { results }, error: null };
  return Response.json(body, { status: 200 });
}
