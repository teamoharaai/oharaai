import { withAuth, type AuthContext } from '@/lib/api/auth';
import { createAuthedClient, isDatabaseConfigured } from '@/lib/db/client';
import { createServiceRoleClient } from '@/lib/db/service-client';
import { getMomentumHomeSummary, safeDiagnostic } from '@/features/momentum/services/momentum-service';

export async function GET(request: Request): Promise<Response> {
  if (!isDatabaseConfigured) {
    return Response.json({ error: 'Database not configured' }, { status: 503 });
  }
  return withAuth(handleGet)(request);
}

async function handleGet(request: Request, _params: Record<string, string>, auth: AuthContext): Promise<Response> {
  try {
    const readDb = createAuthedClient(auth.accessToken);
    const writeDb = createServiceRoleClient();
    const result = await getMomentumHomeSummary(readDb, writeDb, auth.userId);
    const diagnosticsRequested = new URL(request.url).searchParams.get('diagnostics') === '1';
    return Response.json({
      data: {
        ...result.summary,
        ...(diagnosticsRequested ? { diagnostic: safeDiagnostic(result.diagnostic) } : {}),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Momentum calculation failed';
    console.error('[momentum] authoritative calculation failed', {
      algorithmVersion: 'momentum-v1.0',
      error: message,
      userId: auth.userId,
    });
    return Response.json({ error: 'Momentum is temporarily unavailable' }, { status: 500 });
  }
}
