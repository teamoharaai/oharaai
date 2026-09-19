import { FEATURES } from '@/constants/features';
import { withAuth, type AuthContext } from '@/lib/api/auth';
import { createAuthedClient, isDatabaseConfigured } from '@/lib/db/client';
import { fetchGoalTasks, fetchTaskById } from '@/lib/db/tasks';
import {
  completionMode,
  optionalDate,
  optionalNumber,
  optionalString,
  recordValue,
  requiredString,
  scheduleInput,
  validateQuantityConfiguration,
} from '@/features/tasks/validation';

export async function GET(request: Request): Promise<Response> {
  if (!isDatabaseConfigured || !FEATURES.TASKS_V2_ENABLED) return Response.json({ error: 'Tasks unavailable' }, { status: 503 });
  return withAuth(handleGet)(request);
}

async function handleGet(request: Request, _params: Record<string,string>, auth: AuthContext) {
  const goalId = new URL(request.url).searchParams.get('goal_id')?.trim();
  if (!goalId) return Response.json({ error: 'goal_id is required' }, { status: 400 });
  try {
    return Response.json({ data: await fetchGoalTasks(createAuthedClient(auth.accessToken), auth.userId, goalId) });
  } catch (error) {
    console.error('[tasks] fetch failed', error);
    return Response.json({ error: 'Tasks could not be loaded' }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<Response> {
  if (!isDatabaseConfigured || !FEATURES.TASKS_V2_ENABLED) return Response.json({ error: 'Tasks unavailable' }, { status: 503 });
  return withAuth(handlePost)(request);
}

async function handlePost(request: Request, _params: Record<string,string>, auth: AuthContext) {
  try {
    const body = recordValue(await request.json());
    const goalId = requiredString(body.goalId, 'goalId', 100);
    const title = requiredString(body.title, 'title');
    const mode = completionMode(body.completionMode);
    const target = optionalNumber(body.targetQuantity, 'targetQuantity');
    const unit = optionalString(body.quantityUnit, 'quantityUnit', 100);
    const dueDate = optionalDate(body.dueDate, 'dueDate');
    const schedule = scheduleInput(body.schedule);
    validateQuantityConfiguration(mode, target, unit);
    if (schedule && dueDate) throw new Error('Recurring Tasks cannot have a one-time deadline');
    const idempotencyKey = requiredString(body.idempotencyKey, 'idempotencyKey', 200);
    const db = createAuthedClient(auth.accessToken);
    const { data: taskId, error } = await db.rpc('create_task_v1', {
      p_goal_id: goalId,
      p_title: title,
      p_completion_mode: mode,
      p_description: optionalString(body.description, 'description'),
      p_target_quantity: target,
      p_quantity_unit: unit,
      p_due_date: dueDate,
      p_milestone_id: optionalString(body.milestoneId, 'milestoneId', 100),
      p_sort_order: 0,
      p_idempotency_key: idempotencyKey,
      p_schedule_kind: schedule?.recurrenceKind ?? null,
      p_schedule_interval: schedule?.intervalCount ?? 1,
      p_schedule_weekdays: schedule?.weekdays ?? [],
      p_schedule_start: schedule?.startDate ?? null,
      p_schedule_end: schedule?.endDate ?? null,
      p_schedule_local_time: schedule?.localTime ?? null,
      p_schedule_timezone: schedule?.timezone ?? null,
      p_schedule_target_count: schedule?.targetCount ?? null,
    });
    if (error) throw error;
    const task = await fetchTaskById(db, auth.userId, taskId as string);
    return Response.json({ data: task }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid Task request';
    return Response.json({ error: message }, { status: message.includes('required') || message.includes('must') || message.includes('cannot') ? 400 : 500 });
  }
}
