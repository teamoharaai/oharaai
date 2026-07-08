import supabase, { createAuthedClient, isDatabaseConfigured } from '@/lib/db/client';
import {
  getUnconfirmedLinksForUserGoals,
  createLinkForUserGoal,
  confirmLink,
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

function isDuplicateLinkError(error: unknown): error is { code: string; constraint?: string } {
  if (!error || typeof error !== 'object' || !('code' in error)) {
    return false;
  }

  const code = (error as { code?: unknown }).code;
  const constraint = (error as { constraint?: unknown }).constraint;
  return code === '23505' && (
    constraint === undefined ||
    constraint === 'echo_entry_links_echo_entry_id_goal_id_key'
  );
}

// ─── GET /api/echo-links ──────────────────────────────────────────────────────

export async function GET(request: Request): Promise<Response> {
  if (!isDatabaseConfigured) {
    return Response.json({ error: 'Database not configured' }, { status: 503 });
  }

  const auth = await getAuthContextFromRequest(request);
  if (!auth) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const authedDb = createAuthedClient(auth.accessToken);
    const links = await getUnconfirmedLinksForUserGoals(auth.userId, authedDb);
    return Response.json({ links });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    console.error('[echo-links] GET failed', { error: message });
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── POST /api/echo-links ─────────────────────────────────────────────────────

interface CreateEchoLinkBody {
  echoEntryId?: unknown;
  goalId?: unknown;
}

export async function POST(request: Request): Promise<Response> {
  if (!isDatabaseConfigured) {
    return Response.json({ error: 'Database not configured' }, { status: 503 });
  }

  const auth = await getAuthContextFromRequest(request);
  if (!auth) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: CreateEchoLinkBody;
  try {
    body = (await request.json()) as CreateEchoLinkBody;
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  let echoEntryId: string;
  let goalId: string;

  try {
    echoEntryId = sanitizeString(body.echoEntryId, MAX_ID_LENGTH);
    goalId = sanitizeString(body.goalId, MAX_ID_LENGTH);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid request';
    return Response.json({ error: message }, { status: 400 });
  }

  try {
    const authedDb = createAuthedClient(auth.accessToken);
    // createLink inserts with confirmed: false; we immediately confirm manual links
    const link = await createLinkForUserGoal(
      echoEntryId,
      goalId,
      auth.userId,
      'manual',
      undefined,
      authedDb,
    );
    if (!link) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    await confirmLink(link.id, authedDb);
    return Response.json({ link: { ...link, confirmed: true } }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    if (isDuplicateLinkError(error)) {
      return Response.json({ error: 'Link already exists' }, { status: 409 });
    }
    console.error('[echo-links] POST failed', { echoEntryId, goalId, error: message });
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
