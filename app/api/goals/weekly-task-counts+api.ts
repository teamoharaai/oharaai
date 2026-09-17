import { createAuthedClient, isDatabaseConfigured } from '@/lib/db/client';
import { withAuth, type AuthContext } from '@/lib/api/auth';
import { fetchProfileTimezone } from '@/lib/db/goal-activity';
import { fetchWeeklyTaskCountsByGoal } from '@/lib/db/tasks';

// This week's Task-occurrence count per goal for the signed-in user, owner-tz,
// Monday-start (canonical Circles progress rule CD-003). Feeds Today's Focus on
// Home. Own goals only — RLS scopes task_occurrences/tasks to the caller.
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
  const timezone = await fetchProfileTimezone(authedDb, auth.userId);
  const counts = await fetchWeeklyTaskCountsByGoal(authedDb, auth.userId, timezone);
  return Response.json({ counts });
}
