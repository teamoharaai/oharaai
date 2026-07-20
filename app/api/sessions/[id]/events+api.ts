import { withAuth, type AuthContext } from '@/lib/api/auth';
import { createAuthedClient, isDatabaseConfigured } from '@/lib/db/client';
import {
  isRecord,
  requiredString,
  requiredUuid,
  SESSION_EVENT_TYPES,
} from '@/lib/sessions/schema';
import type { SessionEventType } from '@/features/sessions/types';

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
    if (!isRecord(body)) throw new Error('Event payload must be an object');

    const idempotencyKey = requiredString(body.idempotencyKey, 'idempotencyKey', 200);
    const eventType = requiredString(body.type, 'type', 40);
    if (!SESSION_EVENT_TYPES.includes(eventType as SessionEventType)) {
      throw new Error(`type must be one of: ${SESSION_EVENT_TYPES.join(', ')}`);
    }
    if (!isRecord(body.payload)) throw new Error('payload must be an object');

    const authedDb = createAuthedClient(auth.accessToken);
    const { data, error } = await authedDb.rpc('record_agent_session_change', {
      p_session_id: sessionId,
      p_event_key: idempotencyKey,
      p_event_type: eventType,
      p_payload: body.payload,
    });
    if (error) throw error;

    return Response.json({ eventId: data as string }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to record session event';
    const status = /not found/i.test(message) ? 404 : /closed/i.test(message) ? 409 : 400;
    return Response.json({ error: message }, { status });
  }
}
