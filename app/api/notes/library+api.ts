import { withAuth, type AuthContext } from '@/lib/api/auth';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAuthedClient, isDatabaseConfigured } from '@/lib/db/client';
import { createServiceRoleClient } from '@/lib/db/service-client';
import { getNotesLibrary } from '@/lib/db/notes-library';

export async function GET(request: Request): Promise<Response> {
  if (!isDatabaseConfigured) return Response.json({ error: 'Database not configured' }, { status: 503 });
  return withAuth(handleGet)(request);
}

async function handleGet(
  _request: Request,
  _params: Record<string, string>,
  auth: AuthContext,
): Promise<Response> {
  const startedAt = Date.now();
  try {
    const db = createAuthedClient(auth.accessToken);
    let metadataDb: SupabaseClient | null = null;
    try { metadataDb = createServiceRoleClient(); } catch { /* Author names degrade safely. */ }
    const payload = await getNotesLibrary(db, metadataDb, auth.userId);
    return Response.json(payload, {
      headers: {
        'Cache-Control': 'private, no-store',
        'Server-Timing': `notes-library;dur=${Date.now() - startedAt}`,
      },
    });
  } catch (error) {
    console.error('[notes/library] GET failed', {
      error: error instanceof Error ? error.message : 'unknown',
    });
    return Response.json({ error: 'Notes library could not be loaded.' }, { status: 500 });
  }
}
