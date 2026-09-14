import { FEATURES } from '@/constants/features';
import { withAuth, type AuthContext } from '@/lib/api/auth';
import { createAuthedClient, isDatabaseConfigured } from '@/lib/db/client';
import { fetchTaskById } from '@/lib/db/tasks';
import { completionMode, optionalNumber, optionalString, recordValue, requiredString, validateQuantityConfiguration } from '@/features/tasks/validation';

export async function POST(request: Request): Promise<Response> {
  if (!isDatabaseConfigured || !FEATURES.TASKS_V2_ENABLED) return Response.json({ error: 'Tasks unavailable' }, { status: 503 });
  return withAuth(handlePost)(request);
}
async function handlePost(request: Request, _params: Record<string,string>, auth: AuthContext) {
  try {
    const body = recordValue(await request.json());
    const mode = completionMode(body.completionMode);
    const target = optionalNumber(body.targetQuantity, 'targetQuantity');
    const unit = optionalString(body.quantityUnit, 'quantityUnit', 100);
    validateQuantityConfiguration(mode, target, unit);
    const completedAt = requiredString(body.completedAt, 'completedAt', 100);
    if (Number.isNaN(new Date(completedAt).getTime())) throw new Error('completedAt must be an ISO timestamp');
    const db = createAuthedClient(auth.accessToken);
    const { data: taskId, error } = await db.rpc('log_completed_task_v1', {
      p_goal_id: requiredString(body.goalId, 'goalId', 100),
      p_title: requiredString(body.title, 'title'),
      p_completion_mode: mode,
      p_completed_at: completedAt,
      p_description: optionalString(body.description, 'description'),
      p_target_quantity: target,
      p_quantity_unit: unit,
      p_actual_quantity: optionalNumber(body.actualQuantity, 'actualQuantity'),
      p_milestone_id: optionalString(body.milestoneId, 'milestoneId', 100),
      p_idempotency_key: requiredString(body.idempotencyKey, 'idempotencyKey', 200),
    });
    if (error) throw error;
    return Response.json({ data: await fetchTaskById(db, auth.userId, taskId as string) }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Completed Task could not be logged' }, { status: 400 });
  }
}
