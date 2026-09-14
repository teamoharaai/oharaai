import { FEATURES } from '@/constants/features';
import { withAuth, type AuthContext } from '@/lib/api/auth';
import { createAuthedClient, isDatabaseConfigured } from '@/lib/db/client';

export async function POST(request: Request, params: Record<string,string>): Promise<Response> {
  if (!isDatabaseConfigured || !FEATURES.TASKS_V2_ENABLED) return Response.json({ error: 'Tasks unavailable' }, { status: 503 });
  return withAuth(handlePost)(request, params);
}
async function handlePost(request: Request, params: Record<string,string>, auth: AuthContext) {
  const taskId = params.id?.trim();
  if (!taskId) return Response.json({ error: 'Task ID is required' }, { status: 400 });
  const idempotencyKey = request.headers.get('Idempotency-Key')?.trim() ?? `archive:${taskId}`;
  const { error } = await createAuthedClient(auth.accessToken).rpc('archive_task_v1', {
    p_task_id: taskId, p_idempotency_key: idempotencyKey,
  });
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ data: { id: taskId } });
}
