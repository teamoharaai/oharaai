import { withAuth, type AuthContext } from '@/lib/api/auth';
import { createAuthedClient, isDatabaseConfigured } from '@/lib/db/client';
import { readPublishedMomentumV11Summary } from '@/features/momentum/services/momentum-service';

export async function GET(request: Request, params: Record<string, string>): Promise<Response> {
  if (!isDatabaseConfigured) {
    return Response.json({ error: 'Database not configured' }, { status: 503 });
  }
  return withAuth(handleGet)(request, params);
}

async function handleGet(
  request: Request,
  params: Record<string, string>,
  auth: AuthContext,
): Promise<Response> {
  const goalId = params.goalId?.trim();
  if (!goalId) return Response.json({ error: 'Goal ID is required' }, { status: 400 });
  try {
    const readDb = createAuthedClient(auth.accessToken);
    const summary = await readPublishedMomentumV11Summary(readDb, auth.userId);
    const goal = summary.goals.find((candidate) => candidate.goalId === goalId);
    if (!goal) return Response.json({ error: 'Goal not found' }, { status: 404 });
    return Response.json({ data: goal });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Goal Momentum read failed';
    console.error('[momentum] published Goal Momentum read failed', {
      algorithmVersion: 'goal-momentum-v1.1',
      error: message,
      goalId,
      userId: auth.userId,
    });
    return Response.json({ error: 'Goal Momentum is temporarily unavailable' }, { status: 500 });
  }
}
