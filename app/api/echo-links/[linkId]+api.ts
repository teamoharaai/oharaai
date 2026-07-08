import supabase, { createAuthedClient, isDatabaseConfigured } from '@/lib/db/client';
import {
  confirmLink,
  dismissLink,
  getEchoLinkByIdForUserGoal,
} from '@/lib/db/echo-entry-links';

// ─── Auth ─────────────────────────────────────────────────────────────────────

async function getAuthContextFromRequest(request: Request) {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token || !isDatabaseConfigured) return null;

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  return error || !user ? null : { userId: user.id, accessToken: token };
}

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

// ─── PUT /api/echo-links/:linkId ──────────────────────────────────────────────

export async function PUT(
  request: Request,
  params: Record<string, string>,
): Promise<Response> {
  if (!isDatabaseConfigured) {
    return Response.json({ error: 'Database not configured' }, { status: 503 });
  }

  const auth = await getAuthContextFromRequest(request);
  if (!auth) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let linkId: string;
  try {
    linkId = sanitizeString(params.linkId, MAX_ID_LENGTH);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid request';
    return Response.json({ error: message }, { status: 400 });
  }

  try {
    const authedDb = createAuthedClient(auth.accessToken);
    const link = await getEchoLinkByIdForUserGoal(linkId, auth.userId, authedDb);
    if (!link) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    await confirmLink(linkId, authedDb);
    return Response.json({ link: { ...link, confirmed: true } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    console.error('[echo-links] PUT failed', { linkId, error: message });
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── DELETE /api/echo-links/:linkId ──────────────────────────────────────────

export async function DELETE(
  request: Request,
  params: Record<string, string>,
): Promise<Response> {
  if (!isDatabaseConfigured) {
    return Response.json({ error: 'Database not configured' }, { status: 503 });
  }

  const auth = await getAuthContextFromRequest(request);
  if (!auth) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let linkId: string;
  try {
    linkId = sanitizeString(params.linkId, MAX_ID_LENGTH);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid request';
    return Response.json({ error: message }, { status: 400 });
  }

  try {
    const authedDb = createAuthedClient(auth.accessToken);
    const link = await getEchoLinkByIdForUserGoal(linkId, auth.userId, authedDb);
    if (!link) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    await dismissLink(linkId, authedDb);
    return Response.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    console.error('[echo-links] DELETE failed', { linkId, error: message });
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
