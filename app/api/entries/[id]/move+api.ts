import supabase, { createAuthedClient, isDatabaseConfigured } from '@/lib/db/client';
import { isEntryOwnedByUser, moveEntryContainer } from '@/lib/db/echo-entry-links';
import { isGoalOwnedByUser } from '@/lib/db/goals';
import { getFolderByIdForUser } from '@/lib/db/echo-folders';

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
const TARGET_TYPES = ['goal', 'folder'] as const;
type TargetType = (typeof TARGET_TYPES)[number];

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

// ─── PATCH /api/entries/:id/move ──────────────────────────────────────────────
// Body: { target_type: 'goal' | 'folder', target_id: uuid }

interface MoveEntryBody {
  target_type?: unknown;
  target_id?: unknown;
}

export async function PATCH(
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

  let entryId: string;
  try {
    entryId = sanitizeString(params.id, MAX_ID_LENGTH);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid request';
    return Response.json({ error: message }, { status: 400 });
  }

  let body: MoveEntryBody;
  try {
    body = (await request.json()) as MoveEntryBody;
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!(TARGET_TYPES as readonly unknown[]).includes(body.target_type)) {
    return Response.json(
      { error: `target_type must be one of: ${TARGET_TYPES.join(', ')}` },
      { status: 400 },
    );
  }
  const targetType = body.target_type as TargetType;

  let targetId: string;
  try {
    targetId = sanitizeString(body.target_id, MAX_ID_LENGTH);
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

    if (targetType === 'goal') {
      const ownsGoal = await isGoalOwnedByUser(targetId, auth.userId, authedDb);
      if (!ownsGoal) {
        return Response.json({ error: 'Target goal not found' }, { status: 404 });
      }
    } else {
      const folder = await getFolderByIdForUser(targetId, auth.userId, authedDb);
      if (!folder) {
        return Response.json({ error: 'Target folder not found' }, { status: 404 });
      }
    }

    await moveEntryContainer(entryId, { type: targetType, id: targetId }, authedDb);
    return Response.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    console.error('[entries/move] PATCH failed', { entryId, targetType, targetId, error: message });
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
