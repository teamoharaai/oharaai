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
    let error: { message: string } | null = null;
    if (body.status !== undefined) {
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
      .eq('id', occurrenceId).eq('user_id', auth.userId).single();
    if (readError) throw readError;
    return Response.json({ data: mapTaskOccurrence(data) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Occurrence update failed' }, { status: 400 });
  }
}
