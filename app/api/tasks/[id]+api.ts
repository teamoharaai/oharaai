import { FEATURES } from '@/constants/features';
import { withAuth, type AuthContext } from '@/lib/api/auth';
import { createAuthedClient, isDatabaseConfigured } from '@/lib/db/client';
import { fetchTaskById } from '@/lib/db/tasks';
import { completionMode, optionalDate, optionalNumber, optionalString, recordValue, requiredString, validateQuantityConfiguration } from '@/features/tasks/validation';

export async function PATCH(request: Request, params: Record<string,string>): Promise<Response> {
  if (!isDatabaseConfigured || !FEATURES.TASKS_V2_ENABLED) return Response.json({ error: 'Tasks unavailable' }, { status: 503 });
  return withAuth(handlePatch)(request, params);
}
async function handlePatch(request: Request, params: Record<string,string>, auth: AuthContext) {
  try {
    const taskId = requiredString(params.id, 'Task ID', 100);
    const body = recordValue(await request.json());
    const mode = completionMode(body.completionMode);
    const target = optionalNumber(body.targetQuantity, 'targetQuantity');
    const unit = optionalString(body.quantityUnit, 'quantityUnit', 100);
    validateQuantityConfiguration(mode, target, unit);
    const db = createAuthedClient(auth.accessToken);
    const { error } = await db.rpc('update_task_v1', {
      p_task_id: taskId,
      p_title: requiredString(body.title, 'title'),
      p_completion_mode: mode,
      p_description: optionalString(body.description, 'description'),
      p_target_quantity: target,
      p_quantity_unit: unit,
      p_due_date: optionalDate(body.dueDate, 'dueDate'),
      p_milestone_id: optionalString(body.milestoneId, 'milestoneId', 100),
      p_due_time: optionalString(body.dueTime, 'dueTime', 8),
    });
    if (error) throw error;
    return Response.json({ data: await fetchTaskById(db, auth.userId, taskId) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Task update failed' }, { status: 400 });
  }
}
