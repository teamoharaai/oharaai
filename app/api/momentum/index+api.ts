import { withAuth, type AuthContext } from '@/lib/api/auth';
import { createAuthedClient, isDatabaseConfigured } from '@/lib/db/client';
import { getMomentumHomeSummary } from '@/features/momentum/services/momentum-service';

export async function GET(request: Request): Promise<Response> {
  if (!isDatabaseConfigured) {
    return Response.json({ error: 'Database not configured' }, { status: 503 });
  }
  return withAuth(handleGet)(request);
}

async function handleGet(_request: Request, _params: Record<string, string>, auth: AuthContext): Promise<Response> {
  try {
    const readDb = createAuthedClient(auth.accessToken);
    const summary = await getMomentumHomeSummary(readDb, auth.userId);
    return Response.json({ data: summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Momentum read failed';
    console.error('[momentum] published projection read failed', {
      algorithmVersion: 'ohara-momentum-v1.1',
      error: message,
      userId: auth.userId,
    });
    return Response.json({ error: 'Momentum is temporarily unavailable' }, { status: 500 });
  }
}
