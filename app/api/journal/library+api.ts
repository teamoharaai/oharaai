import { withAuth, type AuthContext } from '@/lib/api/auth';
import { createAuthedClient, isDatabaseConfigured } from '@/lib/db/client';
import { getJournalLibrary } from '@/lib/db/journal-library';

export async function GET(request: Request): Promise<Response> {
  if (!isDatabaseConfigured) return Response.json({ error: 'Database not configured' }, { status: 503 });
  return withAuth(handleGet)(request);
}

async function handleGet(
  _request: Request,
  _params: Record<string, string>,
  auth: AuthContext,
): Promise<Response> {
  try {
    const library = await getJournalLibrary(createAuthedClient(auth.accessToken), auth.userId);
    return Response.json(library, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return Response.json({ error: 'Journal could not be loaded.' }, { status: 500 });
  }
}
