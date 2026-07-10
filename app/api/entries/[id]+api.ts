import { isDatabaseConfigured, createAuthedClient } from '@/lib/db/client';
import { withAuth, type AuthContext } from '@/lib/api/auth';
import { isEntryOwnedByUser } from '@/lib/db/echo-entry-links';

// ─── Input sanitization ───────────────────────────────────────────────────────

const MAX_ID_LENGTH = 255;

function sanitizeString(input: unknown, maxLength: number): string {
  if (typeof input !== 'string') throw new Error('Expected string');
  const cleaned = input
    .replace(/\0/g, '')
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  const trimmed = cleaned.trim();
  if (trimmed.length === 0) throw new Error('Value cannot be empty');
  if (trimmed.length > maxLength) throw new Error(`Value exceeds ${maxLength} character limit`);
  return trimmed;
}

// ─── DELETE /api/entries/:id ──────────────────────────────────────────────────
// Hard-deletes an Echo entry the caller owns. The interests.source_thorn_id FK
// is ON DELETE SET NULL, so any interests row derived from this entry keeps its
// row and only nulls its provenance pointer — non-blocking, no consumer reads it.

export async function DELETE(
  request: Request,
  params: Record<string, string>,
): Promise<Response> {
  if (!isDatabaseConfigured) {
    return Response.json({ error: 'Database not configured' }, { status: 503 });
  }
  return withAuth(handleDelete)(request, params);
}

async function handleDelete(
  _request: Request,
  params: Record<string, string>,
  auth: AuthContext,
): Promise<Response> {
  let entryId: string;
  try {
    entryId = sanitizeString(params.id, MAX_ID_LENGTH);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid request';
    return Response.json({ error: message }, { status: 400 });
  }

  try {
    const authedDb = createAuthedClient(auth.accessToken);

    const ownsEntry = await isEntryOwnedByUser(entryId, auth.userId, authedDb);
    if (!ownsEntry) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    const { error } = await authedDb.from('echo_entries').delete().eq('id', entryId);
    if (error) throw error;

    return Response.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    console.error('[entries] DELETE failed', { entryId, error: message });
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
