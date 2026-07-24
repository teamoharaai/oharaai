// GET /api/friends/requests
//
// Returns incoming pending requests (viewer is addressee) and sent-but-
// unanswered requests (viewer is requester), each hydrated to display fields
// so the UI never needs a second round trip.

import { withAuth, type AuthContext } from '@/lib/api/auth';
import { createAuthedClient } from '@/lib/db/client';
import type { ApiResponse } from '@/lib/api/contracts';
import type { IncomingRequest, PersonSummary, SentRequest } from '@/features/friends/types';

function unauthorized(): Response {
  const body: ApiResponse<never> = {
    ok: false,
    data: null,
    error: { code: 'UNAUTHORIZED', message: 'Unauthorized' },
  };
  return Response.json(body, { status: 401 });
}

interface Payload {
  incoming: IncomingRequest[];
  sent: SentRequest[];
}

export async function GET(request: Request): Promise<Response> {
  return withAuth(handleGet, { onUnauthorized: unauthorized })(request);
}

async function handleGet(_request: Request, _params: Record<string, string>, auth: AuthContext): Promise<Response> {
  const db = createAuthedClient(auth.accessToken);

  const { data: rows, error } = await db
    .from('friend_connections')
    .select('id, requester_id, addressee_id, created_at')
    .eq('status', 'pending');

  if (error) {
    const body: ApiResponse<never> = {
      ok: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to load requests' },
    };
    return Response.json(body, { status: 500 });
  }

  const incomingRows = (rows ?? []).filter((r) => r.addressee_id === auth.userId);
  const sentRows = (rows ?? []).filter((r) => r.requester_id === auth.userId);

  const idsToHydrate = Array.from(
    new Set([
      ...incomingRows.map((r) => r.requester_id as string),
      ...sentRows.map((r) => r.addressee_id as string),
    ]),
  );

  let profiles: Record<string, PersonSummary> = {};
  if (idsToHydrate.length > 0) {
    const { data: profRows, error: profErr } = await db.rpc('get_profiles_by_ids', {
      user_ids: idsToHydrate,
    });
    if (profErr) {
      const body: ApiResponse<never> = {
        ok: false,
        data: null,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to hydrate requests' },
      };
      return Response.json(body, { status: 500 });
    }
    profiles = Object.fromEntries(
      (profRows ?? []).map((p: Record<string, unknown>) => [
        p.id as string,
        {
          id: p.id as string,
          username: p.username as string,
          display_name: (p.display_name as string) ?? '',
          avatar_url: (p.avatar_url as string | null) ?? null,
        },
      ]),
    );
  }

  const incoming: IncomingRequest[] = incomingRows
    .map((r) => {
      const from = profiles[r.requester_id as string];
      return from ? { id: r.id as string, created_at: r.created_at as string, from } : null;
    })
    .filter((r): r is IncomingRequest => r !== null);

  const sent: SentRequest[] = sentRows
    .map((r) => {
      const to = profiles[r.addressee_id as string];
      return to ? { id: r.id as string, created_at: r.created_at as string, to } : null;
    })
    .filter((r): r is SentRequest => r !== null);

  const body: ApiResponse<Payload> = {
    ok: true,
    data: { incoming, sent },
    error: null,
  };
  return Response.json(body, { status: 200 });
}
