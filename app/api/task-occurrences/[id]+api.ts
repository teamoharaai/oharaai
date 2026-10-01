import { FEATURES } from '@/constants/features';
import { withAuth, type AuthContext } from '@/lib/api/auth';
import { createAuthedClient, isDatabaseConfigured } from '@/lib/db/client';
import { mapTaskOccurrence } from '@/lib/db/tasks';
import { optionalNumber, recordValue, requiredString } from '@/features/tasks/validation';

export async function PATCH(request: Request, params: Record<string,string>): Promise<Response> {
  if (!isDatabaseConfigured || !FEATURES.TASKS_V2_ENABLED) return Response.json({ error: 'Tasks unavailable' }, { status: 503 });
  return withAuth(handlePatch)(request, params);
}
async function handlePatch(request: Request, params: Record<string,string>, auth: AuthContext) {
  try {
    const occurrenceId = requiredString(params.id, 'Occurrence ID', 100);
    const body = recordValue(await request.json());
    const key = requiredString(body.idempotencyKey, 'idempotencyKey', 200);
    const operations = [body.status !== undefined, body.quantity !== undefined, body.delta !== undefined].filter(Boolean).length;
    if (operations !== 1) throw new Error('Exactly one occurrence mutation is required');
    const db = createAuthedClient(auth.accessToken);
    const { data: occurrence, error: occurrenceError } = await db.from('task_occurrences')
      .select('id,user_id').eq('id', occurrenceId).maybeSingle();
    if (occurrenceError || !occurrence) {
      return Response.json({ error: 'Task occurrence not found' }, { status: 404 });
    }
    const projectMutation = occurrence.user_id !== auth.userId;
    let error: { message: string } | null = null;
    if (projectMutation) {
      if (body.quantity !== undefined) throw new Error('Project quantity changes must use an atomic delta');
      const operation = body.status === 'completed'
        ? 'complete'
        : body.status === 'pending'
          ? 'reopen'
          : body.delta !== undefined
            ? 'adjust'
            : null;
      if (!operation) throw new Error('Invalid Project occurrence mutation');
      ({ error } = await db.rpc('mutate_project_task_occurrence_v12', {
        p_occurrence_id: occurrenceId,
        p_operation: operation,
        p_delta: body.delta === undefined ? null : optionalNumber(body.delta, 'delta'),
        p_idempotency_key: key,
      }));
    } else if (body.status !== undefined) {
      if (!['pending','completed','skipped'].includes(String(body.status))) throw new Error('Invalid occurrence status');
      ({ error } = await db.rpc('set_task_occurrence_status_v1', {
        p_occurrence_id: occurrenceId, p_status: body.status, p_idempotency_key: key,
      }));
    } else if (body.quantity !== undefined) {
      ({ error } = await db.rpc('set_task_occurrence_quantity_v1', {
        p_occurrence_id: occurrenceId, p_quantity: optionalNumber(body.quantity, 'quantity'), p_idempotency_key: key,
      }));
    } else {
      ({ error } = await db.rpc('adjust_task_occurrence_quantity_v1', {
        p_occurrence_id: occurrenceId, p_delta: optionalNumber(body.delta, 'delta'), p_idempotency_key: key,
      }));
    }
    if (error) throw error;
    const { data, error: readError } = await db.from('task_occurrences').select('*')
      .eq('id', occurrenceId).single();
    if (readError) throw readError;
    return Response.json({ data: mapTaskOccurrence(data) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Occurrence update failed';
    const status = /Not permitted|assigned to another member/i.test(message) ? 403
      : /not found/i.test(message) ? 404
        : 400;
    return Response.json({ error: message }, { status });
  }
}
