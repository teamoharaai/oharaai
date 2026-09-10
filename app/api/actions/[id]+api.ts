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
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
  params: Record<string, string>,
): Promise<Response> {
  const context = iosRequestContext(request);
  if (!isDatabaseConfigured) {
    return iosError(context, 503, 'SERVICE_UNAVAILABLE', 'Service unavailable');
  }
  return withAuth(
    (innerRequest, innerParams, auth) => handlePatch(innerRequest, innerParams, auth, context),
    { onUnauthorized: () => iosError(context, 401, 'UNAUTHORIZED', 'Unauthorized') },
  )(request, params);
}

async function handlePatch(
  request: Request,
  params: Record<string, string>,
  auth: AuthContext,
  context: IosRequestContext,
): Promise<Response> {
  const authedDb = createAuthedClient(auth.accessToken);

  const { id } = params;
  if (!id?.trim() || !UUID_PATTERN.test(id.trim())) {
    return iosError(context, 400, 'INVALID_INPUT', 'Action log ID must be a UUID');
  }

  let body: UpdateActionBody;
  try {
    body = (await request.json()) as UpdateActionBody;
  } catch {
    return iosError(context, 400, 'INVALID_INPUT', 'Invalid JSON body');
  }

  const update: Record<string, unknown> = {};

  if (body.status !== undefined) {
    if (!(ACTION_LOG_STATUSES as readonly unknown[]).includes(body.status)) {
      return iosError(context, 422, 'UNPROCESSABLE', 'Invalid action status');
    }
    update.status = body.status;
    if (body.status === 'complete') {
      update.completed_at = new Date().toISOString();
    } else {
      update.completed_at = null;
    }
  }

  if (body.action_text !== undefined) {
    try {
      update.action_text = sanitizeActionText(body.action_text);
    } catch (error) {
      return iosError(context, 422, 'UNPROCESSABLE', 'Invalid action text');
    }
  }

  if (Object.keys(update).length === 0) {
    return iosError(context, 422, 'UNPROCESSABLE', 'No fields to update');
  }

  const { data, error } = await authedDb
    .from('action_logs')
    .update(update)
    .eq('id', id.trim())
    .eq('user_id', auth.userId)
    .select()
    .maybeSingle();

  if (error) {
    logIosRouteFailure('action_update_failed', context, 500, error);
    return iosError(context, 500, 'INTERNAL_ERROR', 'Could not update action');
  }

  if (!data) {
    return iosError(context, 404, 'NOT_FOUND', 'Action log not found');
  }

  return iosJSON(context, { item: mapActionLog(data as Record<string, unknown>) });
}
