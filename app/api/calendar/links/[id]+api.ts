import { withAuth, type AuthContext } from '@/lib/api/auth';
import { createAuthedClient, isDatabaseConfigured } from '@/lib/db/client';
import { mapCalendarExternalLink } from '@/features/calendar/external-links';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function PATCH(request: Request, params: Record<string, string>): Promise<Response> {
  if (!isDatabaseConfigured) return Response.json({ error: 'Calendar unavailable' }, { status: 503 });
  return withAuth(handlePatch)(request, params);
}

async function handlePatch(request: Request, params: Record<string, string>, auth: AuthContext) {
  const linkId = params.id;
  if (!linkId || !UUID.test(linkId)) return Response.json({ error: 'Valid Calendar link identity is required' }, { status: 400 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const db = createAuthedClient(auth.accessToken);
  if (body?.operation === 'finalize') {
    const calendarId = typeof body.calendarId === 'string' ? body.calendarId : '';
    const eventId = typeof body.eventId === 'string' ? body.eventId : '';
    const operationKey = typeof body.operationKey === 'string' ? body.operationKey : '';
    if (!calendarId || calendarId.length > 2048
      || !eventId || eventId.length > 2048
      || !operationKey || operationKey.length > 200) {
      return Response.json({ error: 'External Calendar identity is required' }, { status: 400 });
    }
    const { data, error } = await db.rpc('finalize_calendar_external_link_v1', {
      p_link_id: linkId,
      p_reservation_key: operationKey,
      p_external_calendar_id: calendarId,
      p_external_event_id: eventId,
    });
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json({ data: mapCalendarExternalLink(data as Record<string, unknown>) });
  }
  if (body?.operation === 'state' && ['failed', 'missing', 'unlinked'].includes(String(body.syncState))) {
    const { data, error } = await db.rpc('set_calendar_external_link_state_v1', {
      p_link_id: linkId,
      p_sync_state: body.syncState,
    });
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json({ data: mapCalendarExternalLink(data as Record<string, unknown>) });
  }
  return Response.json({ error: 'Invalid Calendar link operation' }, { status: 400 });
}
