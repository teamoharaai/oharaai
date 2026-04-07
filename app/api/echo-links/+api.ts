import supabase, { isDatabaseConfigured } from '@/lib/db/client';
import {
  getUnconfirmedLinksForUser,
  createLink,
  confirmLink,
} from '@/lib/db/echo-goal-links';

// ─── Auth ─────────────────────────────────────────────────────────────────────

async function getUserFromRequest(request: Request) {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  return error || !user ? null : user;
}

// ─── Input sanitization ───────────────────────────────────────────────────────

function sanitizeId(input: unknown, field: string): string {
  if (typeof input !== 'string' || !input.trim()) {
    throw new Error(`${field} is required`);
  }
  return input.trim();
}

// ─── GET /api/echo-links ──────────────────────────────────────────────────────

export async function GET(request: Request): Promise<Response> {
  if (!isDatabaseConfigured) {
    return Response.json({ error: 'Database not configured' }, { status: 503 });
  }

  const user = await getUserFromRequest(request);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const links = await getUnconfirmedLinksForUser(user.id);
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

  const user = await getUserFromRequest(request);
  if (!user) {
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
    echoEntryId = sanitizeId(body.echoEntryId, 'echoEntryId');
    goalId = sanitizeId(body.goalId, 'goalId');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid request';
    return Response.json({ error: message }, { status: 400 });
  }

  // Verify goal ownership before creating link
  const { data: goal, error: goalError } = await supabase
    .from('goals')
    .select('id')
    .eq('id', goalId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (goalError) {
    console.error('[echo-links] goal ownership check failed', { goalId, error: goalError.message });
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
  if (!goal) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    // createLink inserts with confirmed: false; we immediately confirm manual links
    const link = await createLink(echoEntryId, goalId, 'manual');
    await confirmLink(link.id);
    return Response.json({ link: { ...link, confirmed: true } }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    // Detect unique constraint violation (duplicate link)
    if (message.toLowerCase().includes('duplicate key')) {
      return Response.json({ error: 'Link already exists' }, { status: 409 });
    }
    console.error('[echo-links] POST failed', { echoEntryId, goalId, error: message });
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
