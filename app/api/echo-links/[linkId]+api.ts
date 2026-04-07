import supabase, { isDatabaseConfigured } from '@/lib/db/client';
import { confirmLink, dismissLink } from '@/lib/db/echo-goal-links';
import type { EchoGoalLink } from '@/types/echo-link';

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

// ─── Ownership helper ─────────────────────────────────────────────────────────

type DbLinkRow = {
  id: string;
  echo_entry_id: string;
  goal_id: string;
  link_source: string;
  confidence: number | null;
  confirmed: boolean;
  created_at: string;
};

async function getLinkForUser(
  linkId: string,
  userId: string,
): Promise<EchoGoalLink | null> {
  // Fetch the link itself
  const { data: linkRow, error: linkError } = await supabase
    .from('echo_goal_links')
    .select('id, echo_entry_id, goal_id, link_source, confidence, confirmed, created_at')
    .eq('id', linkId)
    .maybeSingle();

  if (linkError || !linkRow) return null;

  const row = linkRow as unknown as DbLinkRow;

  // Confirm ownership via associated goal
  const { data: goal, error: goalError } = await supabase
    .from('goals')
    .select('id')
    .eq('id', row.goal_id)
    .eq('user_id', userId)
    .maybeSingle();

  if (goalError || !goal) return null;

  return {
    id: row.id,
    echoEntryId: row.echo_entry_id,
    goalId: row.goal_id,
    linkSource: row.link_source as EchoGoalLink['linkSource'],
    confidence: row.confidence,
    confirmed: row.confirmed,
    createdAt: row.created_at,
  };
}

// ─── PUT /api/echo-links/:linkId ──────────────────────────────────────────────

export async function PUT(
  request: Request,
  { params }: { params: { linkId: string } },
): Promise<Response> {
  if (!isDatabaseConfigured) {
    return Response.json({ error: 'Database not configured' }, { status: 503 });
  }

  const user = await getUserFromRequest(request);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { linkId } = params;
  if (!linkId?.trim()) {
    return Response.json({ error: 'linkId is required' }, { status: 400 });
  }

  try {
    const link = await getLinkForUser(linkId.trim(), user.id);
    if (!link) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    await confirmLink(linkId.trim());
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
  { params }: { params: { linkId: string } },
): Promise<Response> {
  if (!isDatabaseConfigured) {
    return Response.json({ error: 'Database not configured' }, { status: 503 });
  }

  const user = await getUserFromRequest(request);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { linkId } = params;
  if (!linkId?.trim()) {
    return Response.json({ error: 'linkId is required' }, { status: 400 });
  }

  try {
    const link = await getLinkForUser(linkId.trim(), user.id);
    if (!link) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    await dismissLink(linkId.trim());
    return Response.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    console.error('[echo-links] DELETE failed', { linkId, error: message });
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
