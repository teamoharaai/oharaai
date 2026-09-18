import { createAuthedClient, isDatabaseConfigured } from '@/lib/db/client';
import { withAuth, type AuthContext } from '@/lib/api/auth';
import { fetchProfileTimezone } from '@/lib/db/goal-activity';
import { fetchWeeklyTaskCountsByGoal } from '@/lib/db/tasks';
import { fetchActiveGoalReflectionTimestamps } from '@/lib/db/home-summary';

// Home aggregator (Stage 2). One authenticated round-trip returning the
// goal-derived signals Today's Focus needs:
//   - weeklyTaskCounts: this week's canonical Task-occurrence count per goal
//     (owner-tz, Monday-start; CD-003). Never reads legacy trackers.
//   - reflectionTimestamps: latest reflection timestamp per active goal, used to
//     order Today's Focus.
// Both are computed server-side in parallel and scoped to the caller. This
// replaces two separate client fetches that each had to wait for the client to
// load goals first. New Home signals belong here, not in a new client fetch.
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
  const [weeklyTaskCounts, reflectionTimestamps] = await Promise.all([
    fetchProfileTimezone(authedDb, auth.userId).then((timezone) =>
      fetchWeeklyTaskCountsByGoal(authedDb, auth.userId, timezone),
    ),
    fetchActiveGoalReflectionTimestamps(authedDb, auth.userId),
  ]);
  return Response.json({ weeklyTaskCounts, reflectionTimestamps });
}
