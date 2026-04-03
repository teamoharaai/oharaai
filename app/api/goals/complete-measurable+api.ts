import supabase, { isDatabaseConfigured } from '@/lib/db/client';
import { completeMeasurable, getGoalProgressById } from '@/lib/db/goals';

type CompleteMeasurableRequest = {
  measurableId?: string;
  goalId?: string;
};

export async function POST(request: Request): Promise<Response> {
  if (!isDatabaseConfigured) {
    return Response.json({ error: 'Database not configured' }, { status: 503 });
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
    await completeMeasurable(measurableId, goalId, user.id);
    const progress = await getGoalProgressById(goalId, user.id);
    return Response.json({ success: true, progress });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to complete measurable';
    return Response.json({ error: message }, { status: 500 });
  }
}
