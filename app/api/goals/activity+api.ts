import { createAuthedClient, isDatabaseConfigured } from '@/lib/db/client';
import { withAuth, type AuthContext } from '@/lib/api/auth';
import { getActivityByGoalId } from '@/lib/db/goals';

export async function GET(request: Request): Promise<Response> {
  if (!isDatabaseConfigured) {
    return Response.json({ error: 'Database not configured' }, { status: 503 });
  }
  return withAuth(handleGet)(request);
}

async function handleGet(request: Request, _params: Record<string, string>, auth: AuthContext): Promise<Response> {
  const url = new URL(request.url);
  const goalId = url.searchParams.get('goalId');
  if (!goalId) {
    return Response.json({ error: 'goalId is required' }, { status: 400 });
  }

  const authedDb = createAuthedClient(auth.accessToken);
  const items = await getActivityByGoalId(goalId, auth.userId, authedDb);
  return Response.json({ items });
}
