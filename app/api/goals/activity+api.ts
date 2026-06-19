import supabase, { createAuthedClient, isDatabaseConfigured } from '@/lib/db/client';
import { getActivityByGoalId } from '@/lib/db/goals';

export async function GET(request: Request): Promise<Response> {
  if (!isDatabaseConfigured) {
    return Response.json({ error: 'Database not configured' }, { status: 503 });
  }

  const url = new URL(request.url);
  const goalId = url.searchParams.get('goalId');
  if (!goalId) {
    return Response.json({ error: 'goalId is required' }, { status: 400 });
  }

  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const authedDb = createAuthedClient(token);
  const items = await getActivityByGoalId(goalId, user.id, authedDb);
  return Response.json({ items });
}
