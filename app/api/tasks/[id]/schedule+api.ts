import { FEATURES } from '@/constants/features';
import { withAuth, type AuthContext } from '@/lib/api/auth';
import { createAuthedClient, isDatabaseConfigured } from '@/lib/db/client';
import { optionalDate, recordValue, requiredString, scheduleInput } from '@/features/tasks/validation';

export async function PUT(request: Request, params: Record<string,string>): Promise<Response> {
  if (!isDatabaseConfigured || !FEATURES.TASKS_V2_ENABLED) return Response.json({ error: 'Tasks unavailable' }, { status: 503 });
  return withAuth(handlePut)(request, params);
}
async function handlePut(request: Request, params: Record<string,string>, auth: AuthContext) {
  try {
    const taskId = requiredString(params.id, 'Task ID', 100);
    const body = recordValue(await request.json());
    const schedule = scheduleInput(body.schedule);
    const dueDate = optionalDate(body.dueDate, 'dueDate');
    if (schedule && dueDate) throw new Error('Recurring Tasks cannot have a one-time deadline');
    const { data, error } = await createAuthedClient(auth.accessToken).rpc('replace_task_schedule_v1', {
      p_task_id: taskId,
      p_recurrence_kind: schedule?.recurrenceKind ?? null,
      p_interval_count: schedule?.intervalCount ?? 1,
      p_weekdays: schedule?.weekdays ?? [],
      p_start_date: schedule?.startDate ?? null,
      p_end_date: schedule?.endDate ?? null,
      p_local_time: schedule?.localTime ?? null,
      p_timezone: schedule?.timezone ?? null,
      p_due_date: dueDate,
      p_idempotency_key: requiredString(body.idempotencyKey, 'idempotencyKey', 200),
    });
    if (error) throw error;
    return Response.json({ data: { scheduleId: data as string | null } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Schedule update failed' }, { status: 400 });
  }
}
