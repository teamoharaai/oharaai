import { withAuth, type AuthContext } from '@/lib/api/auth';
import { createAuthedClient, isDatabaseConfigured } from '@/lib/db/client';
import { mapCalendarExternalLink, type CalendarLinkEntityType } from '@/features/calendar/external-links';

const ENTITY_TYPES = new Set<CalendarLinkEntityType>(['task_occurrence', 'milestone', 'goal_deadline']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: Request): Promise<Response> {
  if (!isDatabaseConfigured) return Response.json({ error: 'Calendar unavailable' }, { status: 503 });
  return withAuth(handleGet)(request);
}

async function handleGet(request: Request, _params: Record<string, string>, auth: AuthContext) {
  const url = new URL(request.url);
  const entityType = url.searchParams.get('entityType') as CalendarLinkEntityType | null;
  const entityId = url.searchParams.get('entityId');
  if (!entityType || !ENTITY_TYPES.has(entityType) || !entityId || !UUID.test(entityId)) {
    return Response.json({ error: 'Valid Calendar entity identity is required' }, { status: 400 });
  }
  const { data, error } = await createAuthedClient(auth.accessToken)
    .from('calendar_external_links')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .eq('provider', 'apple')
    .maybeSingle();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ data: data ? mapCalendarExternalLink(data) : null });
}

export async function POST(request: Request): Promise<Response> {
  if (!isDatabaseConfigured) return Response.json({ error: 'Calendar unavailable' }, { status: 503 });
  return withAuth(handlePost)(request);
}

async function handlePost(request: Request, _params: Record<string, string>, auth: AuthContext) {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const entityType = body?.entityType as CalendarLinkEntityType | undefined;
  const entityId = typeof body?.entityId === 'string' ? body.entityId : '';
  const calendarId = typeof body?.calendarId === 'string' ? body.calendarId : '';
  const operationKey = typeof body?.operationKey === 'string' ? body.operationKey : '';
  if (!entityType || !ENTITY_TYPES.has(entityType) || !UUID.test(entityId)
    || !calendarId || calendarId.length > 2048
    || !operationKey || operationKey.length > 200
    || body?.provider !== 'apple') {
    return Response.json({ error: 'Valid Apple Calendar export details are required' }, { status: 400 });
  }
  const { data, error } = await createAuthedClient(auth.accessToken).rpc('reserve_calendar_external_link_v1', {
    p_entity_type: entityType,
    p_entity_id: entityId,
    p_provider: 'apple',
    p_external_calendar_id: calendarId,
    p_reservation_key: operationKey,
  });
  if (error) return Response.json({ error: error.message }, { status: error.message.includes('not exportable') ? 403 : 409 });
  return Response.json({ data: mapCalendarExternalLink(data as Record<string, unknown>) });
}
