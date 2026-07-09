import { createAuthedClient, isDatabaseConfigured } from '@/lib/db/client';
import { withAuth, type AuthContext } from '@/lib/api/auth';
import { completeMeasurable, getGoalProgressById } from '@/lib/db/goals';

type CompleteMeasurableRequest = {
  measurableId?: string;
  goalId?: string;
};

export async function POST(request: Request): Promise<Response> {
  if (!isDatabaseConfigured) {
    return Response.json({ error: 'Database not configured' }, { status: 503 });
  }
  return withAuth(handlePost)(request);
}

async function handlePost(request: Request, _params: Record<string, string>, auth: AuthContext): Promise<Response> {
  const authedDb = createAuthedClient(auth.accessToken);

  let body: CompleteMeasurableRequest;
  try {
    body = (await request.json()) as CompleteMeasurableRequest;
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const measurableId = body.measurableId?.trim();
  const goalId = body.goalId?.trim();

  if (!measurableId || !goalId) {
    return Response.json({ error: 'measurableId and goalId are required' }, { status: 400 });
  }

  try {
    await completeMeasurable(measurableId, goalId, auth.userId, authedDb);
    const progress = await getGoalProgressById(goalId, auth.userId, authedDb);
    return Response.json({ success: true, progress });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to complete measurable';
    return Response.json({ error: message }, { status: 500 });
  }
}
