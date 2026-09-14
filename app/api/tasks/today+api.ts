import { FEATURES } from '@/constants/features';
import { withAuth, type AuthContext } from '@/lib/api/auth';
import { createAuthedClient, isDatabaseConfigured } from '@/lib/db/client';
import { fetchTodayTaskItems } from '@/lib/db/tasks';

export async function GET(request: Request): Promise<Response> {
  if (!isDatabaseConfigured || !FEATURES.TASKS_V2_ENABLED) return Response.json({ error: 'Tasks unavailable' }, { status: 503 });
  return withAuth(handleGet)(request);
}
async function handleGet(_request: Request, _params: Record<string,string>, auth: AuthContext) {
  try {
    return Response.json({ data: await fetchTodayTaskItems(createAuthedClient(auth.accessToken), auth.userId) });
  } catch (error) {
    console.error('[tasks/today] projection failed', error);
    return Response.json({ error: 'Today’s Focus could not be loaded' }, { status: 500 });
  }
}
