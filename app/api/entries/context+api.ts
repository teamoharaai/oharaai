import { withAuth, type AuthContext } from '@/lib/api/auth';
import { createAuthedClient, isDatabaseConfigured } from '@/lib/db/client';
import { getEntryGoalOptions } from '@/lib/db/entries';

export async function GET(request: Request): Promise<Response> {
  if (!isDatabaseConfigured) {
    return Response.json({ error: 'Database not configured' }, { status: 503 });
  }
  return withAuth(handleGet)(request);
}

async function handleGet(
  _request: Request,
  _params: Record<string, string>,
  auth: AuthContext,
): Promise<Response> {
  try {
    const goals = await getEntryGoalOptions(createAuthedClient(auth.accessToken), auth.userId);
    return Response.json({ goals });
  } catch {
    return Response.json({ error: 'Could not load entry context' }, { status: 500 });
  }
}
