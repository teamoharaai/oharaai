import { createAuthedClient, isDatabaseConfigured } from '@/lib/db/client';
import { withAuth, type AuthContext } from '@/lib/api/auth';
import {
  iosError,
  iosJSON,
  iosRequestContext,
  logIosRouteFailure,
  type IosRequestContext,
} from '@/lib/api/ios-contract';
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
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

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

function sanitizeUuid(input: unknown, field: string): string {
  const value = typeof input === 'string' ? input.trim() : '';
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new Error(`${field} is required`);
  }
  return value;
}

function sanitizeOptionalDate(input: unknown): string | null {
  if (input === undefined || input === null) return null;
  if (typeof input !== 'string') throw new Error('due_date must be a string');
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new Error('due_date must be in YYYY-MM-DD format');
  }
  return trimmed;
}

// ─── GET /api/actions ─────────────────────────────────────────────────────────
// Query params: goal_id (required), status (optional), limit (optional, default 10)

export async function GET(request: Request): Promise<Response> {
  const context = iosRequestContext(request);
  if (!isDatabaseConfigured) {
    return iosError(context, 503, 'SERVICE_UNAVAILABLE', 'Service unavailable');
  }
  return withAuth(
    (innerRequest, params, auth) => handleGet(innerRequest, params, auth, context),
    { onUnauthorized: () => iosError(context, 401, 'UNAUTHORIZED', 'Unauthorized') },
  )(request);
}

async function handleGet(
  request: Request,
  _params: Record<string, string>,
  auth: AuthContext,
  context: IosRequestContext,
): Promise<Response> {
  const url = new URL(request.url);
  let goalId: string;
  try { goalId = sanitizeUuid(url.searchParams.get('goal_id'), 'goal_id'); }
  catch { return iosError(context, 400, 'INVALID_INPUT', 'goal_id must be a UUID'); }

  const statusParam = url.searchParams.get('status');
  if (statusParam && !(ACTION_LOG_STATUSES as readonly string[]).includes(statusParam)) {
    return iosError(context, 400, 'INVALID_INPUT', 'Invalid action status');
  }

  const rawLimit = url.searchParams.get('limit');
  const limit = rawLimit ? Math.min(Math.max(1, parseInt(rawLimit, 10) || DEFAULT_LIMIT), MAX_LIMIT) : DEFAULT_LIMIT;

  const authedDb = createAuthedClient(auth.accessToken);

  let query = authedDb
    .from('action_logs')
    .select('*')
    .eq('goal_id', goalId)
    .eq('user_id', auth.userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (statusParam) {
    query = query.eq('status', statusParam);
  }

  const { data, error } = await query;

  if (error) {
    logIosRouteFailure('actions_read_failed', context, 500, error);
    return iosError(context, 500, 'INTERNAL_ERROR', 'Could not load actions');
  }

  return iosJSON(context, { items: ((data as Record<string, unknown>[]) ?? []).map(mapActionLog) });
}

// ─── POST /api/actions ────────────────────────────────────────────────────────
// Body: { goal_id, action_text, due_date? }

interface CreateActionBody {
  goal_id?: unknown;
  action_text?: unknown;
  due_date?: unknown;
}

export async function POST(request: Request): Promise<Response> {
  if (!isDatabaseConfigured) {
    return Response.json({ error: 'Database not configured' }, { status: 503 });
  }
  return withAuth(handlePost)(request);
}

async function handlePost(request: Request, _params: Record<string, string>, auth: AuthContext): Promise<Response> {
  let body: CreateActionBody;
  try {
    body = (await request.json()) as CreateActionBody;
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  let goalId: string;
  let actionText: string;
  let dueDate: string | null;

  try {
    goalId = sanitizeUuid(body.goal_id, 'goal_id');
    actionText = sanitizeActionText(body.action_text);
    dueDate = sanitizeOptionalDate(body.due_date);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid request';
    return Response.json({ error: message }, { status: 400 });
  }

  const authedDb = createAuthedClient(auth.accessToken);

  const { data, error } = await authedDb
    .from('action_logs')
    .insert({
      goal_id: goalId,
      user_id: auth.userId,
      action_text: actionText,
      status: 'pending',
      due_date: dueDate,
    })
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ item: mapActionLog(data as Record<string, unknown>) }, { status: 201 });
}
