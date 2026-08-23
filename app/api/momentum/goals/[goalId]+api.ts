import { withAuth, type AuthContext } from '@/lib/api/auth';
import { createAuthedClient, isDatabaseConfigured } from '@/lib/db/client';
import { createServiceRoleClient } from '@/lib/db/service-client';
import { getMomentumV11Summary, safeGoalDiagnostic } from '@/features/momentum/services/momentum-service';

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
    const writeDb = createServiceRoleClient();
    const result = await getMomentumV11Summary(readDb, writeDb, auth.userId);
    const goal = result.summary.goals.find((candidate) => candidate.goalId === goalId);
    if (!goal) return Response.json({ error: 'Goal not found' }, { status: 404 });
    const diagnosticsRequested = new URL(request.url).searchParams.get('diagnostics') === '1';
    const diagnostic = result.goalDiagnostics.find((candidate) => candidate.result.goalId === goalId);
    return Response.json({
      data: {
        ...goal,
        ...(diagnosticsRequested && diagnostic ? { diagnostic: safeGoalDiagnostic(diagnostic) } : {}),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Goal Momentum calculation failed';
    console.error('[momentum] authoritative Goal Momentum calculation failed', {
      algorithmVersion: 'goal-momentum-v1.1',
      error: message,
      goalId,
      userId: auth.userId,
    });
    return Response.json({ error: 'Goal Momentum is temporarily unavailable' }, { status: 500 });
  }
}
