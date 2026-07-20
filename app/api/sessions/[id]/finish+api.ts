import { withAuth, type AuthContext } from '@/lib/api/auth';
import { createAuthedClient, isDatabaseConfigured } from '@/lib/db/client';
import {
  isRecord,
  requiredString,
  requiredUuid,
  validateSessionSummary,
} from '@/lib/sessions/schema';

type FinishRpcRow = {
  session_status: 'active' | 'draft' | 'published' | 'failed';
  final_entry_id: string | null;
  requires_approval: boolean;
};

export async function POST(request: Request, params: Record<string, string>): Promise<Response> {
  if (!isDatabaseConfigured) {
    return Response.json({ error: 'Database not configured' }, { status: 503 });
  }
  return withAuth(handlePost)(request, params);
}
async function handlePost(
  request: Request,
  params: Record<string, string>,
  auth: AuthContext,
): Promise<Response> {
  try {
    const sessionId = requiredUuid(params.id, 'session id');
    const body = (await request.json()) as unknown;
    if (!isRecord(body)) throw new Error('Finish payload must be an object');
    const idempotencyKey = requiredString(body.idempotencyKey, 'idempotencyKey', 200);
    const summary = validateSessionSummary(body.summary);

    const authedDb = createAuthedClient(auth.accessToken);
    const { data, error } = await authedDb.rpc('finish_agent_session', {
      p_session_id: sessionId,
      p_idempotency_key: idempotencyKey,
      p_summary: summary,
    });
    if (error) throw error;
    const row = (data as FinishRpcRow[] | null)?.[0];
    if (!row) throw new Error('Finish transaction returned no result');

    return Response.json({
      status: row.session_status,
      finalEntryId: row.final_entry_id,
      requiresApproval: row.requires_approval,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to finish session';
    const status = /not found/i.test(message) ? 404 : /only an active/i.test(message) ? 409 : 400;
    return Response.json({ error: message }, { status });
  }
}
