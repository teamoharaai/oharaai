import { withAuth, type AuthContext } from '@/lib/api/auth';
import { createAuthedClient, isDatabaseConfigured } from '@/lib/db/client';
import { fetchOharaCalendarItems } from '@/lib/db/calendar';
import { addLocalDays, normalizeTimezone } from '@/lib/time/zoned-calendar';

const YMD = /^\d{4}-\d{2}-\d{2}$/;

function parseRange(request: Request) {
  const url = new URL(request.url);
  const startDate = url.searchParams.get('start') ?? '';
  const endDate = url.searchParams.get('end') ?? '';
  if (!YMD.test(startDate) || !YMD.test(endDate) || endDate < startDate) {
    throw new Error('Calendar range must use valid YYYY-MM-DD start and end dates.');
  }
  // Month view plus leading/trailing navigation stays intentionally bounded.
  if (endDate > addLocalDays(startDate, 62)) {
    throw new Error('Calendar range cannot exceed 63 days.');
  }
  return {
    startDate,
    endDate,
    timezone: normalizeTimezone(url.searchParams.get('timezone')),
  };
}
export async function GET(request: Request): Promise<Response> {
  if (!isDatabaseConfigured) return Response.json({ error: 'Calendar unavailable' }, { status: 503 });
  return withAuth(handleGet)(request);
}

async function handleGet(request: Request, _params: Record<string, string>, auth: AuthContext) {
  try {
    const range = parseRange(request);
    const data = await fetchOharaCalendarItems(createAuthedClient(auth.accessToken), range);
    return Response.json({ data }, { headers: { 'Cache-Control': 'private, max-age=15, stale-while-revalidate=30' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Calendar could not be loaded';
    const invalid = message.startsWith('Calendar range');
    if (!invalid) console.error('[calendar/items] projection failed', error);
    return Response.json({ error: message }, { status: invalid ? 400 : 500 });
  }
}
