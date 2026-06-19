import supabase, { createAuthedClient, isDatabaseConfigured } from '@/lib/db/client';
import type { ActionLog, ActionLogStatus } from '@/features/actions/types';

const ACTION_LOG_STATUSES: readonly ActionLogStatus[] = ['pending', 'complete', 'skipped'];

function mapActionLog(row: Record<string, unknown>): ActionLog {
  return {
    id: row.id as string,
    goalId: row.goal_id as string,
    userId: row.user_id as string,
    actionText: row.action_text as string,
    status: row.status as ActionLog['status'],
    dueDate: (row.due_date as string | null) ?? null,
    completedAt: (row.completed_at as string | null) ?? null,
    createdAt: row.created_at as string,
  };
}
const MAX_ACTION_TEXT_LENGTH = 1000;

function sanitizeActionText(input: unknown): string {
  if (typeof input !== 'string') throw new Error('action_text must be a string');
  const cleaned = input
    .replace(/\0/g, '')
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim();
  if (!cleaned) throw new Error('action_text cannot be empty');
  if (cleaned.length > MAX_ACTION_TEXT_LENGTH) {
    throw new Error(`action_text exceeds ${MAX_ACTION_TEXT_LENGTH} character limit`);
  }
  return cleaned;
}

// ─── PATCH /api/actions/[id] ─────────────────────────────────────────────────
// Body: { status?, action_text? }
// If status = 'complete', completed_at is set to now()

interface UpdateActionBody {
  status?: unknown;
  action_text?: unknown;
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  if (!isDatabaseConfigured) {
    return Response.json({ error: 'Database not configured' }, { status: 503 });
  }

  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const authedDb = createAuthedClient(token);

  const { id } = params;
  if (!id?.trim()) {
    return Response.json({ error: 'Action log ID is required' }, { status: 400 });
  }

  let body: UpdateActionBody;
  try {
    body = (await request.json()) as UpdateActionBody;
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const update: Record<string, unknown> = {};

  if (body.status !== undefined) {
    if (!(ACTION_LOG_STATUSES as readonly unknown[]).includes(body.status)) {
      return Response.json(
        { error: `status must be one of: ${ACTION_LOG_STATUSES.join(', ')}` },
        { status: 400 },
      );
    }
    update.status = body.status;
    if (body.status === 'complete') {
      update.completed_at = new Date().toISOString();
    }
  }

  if (body.action_text !== undefined) {
    try {
      update.action_text = sanitizeActionText(body.action_text);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid action_text';
      return Response.json({ error: message }, { status: 400 });
    }
  }

  if (Object.keys(update).length === 0) {
    return Response.json({ error: 'No fields to update' }, { status: 400 });
  }

  const { data, error } = await authedDb
    .from('action_logs')
    .update(update)
    .eq('id', id.trim())
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return Response.json({ error: 'Action log not found' }, { status: 404 });
  }

  return Response.json({ item: mapActionLog(data as Record<string, unknown>) });
}
