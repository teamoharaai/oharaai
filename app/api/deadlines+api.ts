import { createAuthedClient, isDatabaseConfigured } from '@/lib/db/client';
import { withAuth, type AuthContext } from '@/lib/api/auth';
import { fetchGoalDeadlineDensity } from '@/lib/db/deadlines';

// Cross-goal deadline aggregator (Goal Detail Redesign Phase 3). One
// authenticated round-trip returning `{ density: { date → { count, byKind } } }`
// for every future-facing due date across the caller's active goals (milestone
// target dates + Task/Reminder deadlines). Computed server-side, scoped to the
// caller. Feeds the amber deadline calendar; a new deadline signal belongs here,
// not in a new client round-trip.
export async function GET(request: Request): Promise<Response> {
  if (!isDatabaseConfigured) {
    return Response.json({ error: 'Database not configured' }, { status: 503 });
  }
  return withAuth(handleGet)(request);
}

async function handleGet(
  _request: Request,
  _params: Record<string, string>,
  auth: AuthContext,
): Promise<Response> {
  const authedDb = createAuthedClient(auth.accessToken);
  const density = await fetchGoalDeadlineDensity(authedDb, auth.userId);
  return Response.json({ density });
}
