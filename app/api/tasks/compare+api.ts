import { FEATURES } from '@/constants/features';
import { withAuth, type AuthContext } from '@/lib/api/auth';
import { createAuthedClient, isDatabaseConfigured } from '@/lib/db/client';
import { compareLegacyTaskMigration } from '@/lib/db/tasks';

export async function GET(request: Request): Promise<Response> {
  if (!isDatabaseConfigured || !FEATURES.TASKS_V2_ENABLED) return Response.json({ error: 'Tasks unavailable' }, { status: 503 });
  if (!FEATURES.TASKS_V2_COMPARE_LEGACY) return Response.json({ error: 'Comparison disabled' }, { status: 404 });
  return withAuth(handleGet)(request);
}
async function handleGet(request: Request, _params: Record<string,string>, auth: AuthContext) {
  const goalId = new URL(request.url).searchParams.get('goal_id')?.trim();
  if (!goalId) return Response.json({ error: 'goal_id is required' }, { status: 400 });
  try {
    return Response.json({ data: await compareLegacyTaskMigration(createAuthedClient(auth.accessToken), auth.userId, goalId) });
  } catch (error) {
    console.error('[tasks/compare] failed', error);
    return Response.json({ error: 'Task migration comparison failed' }, { status: 500 });
  }
}
