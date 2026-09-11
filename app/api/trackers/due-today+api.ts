import { withAuth, type AuthContext } from '@/lib/api/auth';
import { createAuthedClient, isDatabaseConfigured } from '@/lib/db/client';
import { fetchAllPages } from '@/lib/db/paginate';
import { getPeriodBounds } from '@/lib/goals/tracker-cadence';
import { deriveDueTodayState } from '@/lib/goals/due-today';
import type { TrackerMeasure, TrackerPeriodLog } from '@/lib/goals/tracker-period';
import { normalizeTimezone } from '@/lib/time/zoned-calendar';

type TrackerType = TrackerMeasure;

interface DueTodayTracker {
  id: string;
  title: string;
  type: TrackerType;
  targetValue: number | null;
  targetUnit: string | null;
  currentPeriodValue: number;
  isCompletedThisPeriod: boolean;
  periodEndExclusive: string;
}

interface DueTodayGoalGroup {
  goalId: string;
  goalTitle: string;
  trackers: DueTodayTracker[];
}

interface DbTrackerRow {
  id: string;
  title: string;
  type: string;
  target_value: number | null;
  target_unit: string | null;
  goal_id: string;
  goals: { title: string } | null;
}

interface DbPeriodLogRow {
  tracker_id: string;
  value: number | string | null;
  logged_at: string;
}

export async function GET(request: Request): Promise<Response> {
  if (!isDatabaseConfigured) {
    return Response.json({ error: 'Database not configured' }, { status: 503 });
  }
  return withAuth(handleGet)(request);
}

async function handleGet(
  _request: Request,
  _params: Record<string, string>,
  auth: AuthContext,
): Promise<Response> {
  const authedDb = createAuthedClient(auth.accessToken);

  // One `asOf` for the whole request; every daily tracker shares this window.
  const asOf = new Date();

  // The daily window is evaluated in the user's stored timezone, never the
  // Vercel/server process zone. profiles.timezone is NOT NULL default 'UTC';
  // normalizeTimezone still guards against invalid strings.
  const { data: profileRow, error: profileError } = await authedDb
    .from('profiles')
    .select('timezone')
    .eq('id', auth.userId)
    .maybeSingle();

  if (profileError) {
    console.error('[due-today] profile timezone fetch error', profileError);
    return Response.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }

  const timezone = normalizeTimezone(
    (profileRow as { timezone?: string } | null)?.timezone ?? 'UTC',
  );
  const dailyBounds = getPeriodBounds('daily', asOf, timezone);

  const { data: trackerRows, error: trackersError } = await authedDb
    .from('trackers')
    .select('id, title, type, target_value, target_unit, goal_id, goals!inner(title)')
    .eq('frequency', 'daily')
    .eq('goals.status', 'active')
    .eq('goals.user_id', auth.userId);

  if (trackersError) {
    console.error('[due-today] trackers fetch error', trackersError);
    return Response.json({ error: 'Failed to fetch trackers' }, { status: 500 });
  }

  const rows = (trackerRows ?? []) as unknown as DbTrackerRow[];
  if (rows.length === 0) {
    return Response.json({ data: [] });
  }

  const trackerIds = rows.map((row) => row.id);
  const startIso = dailyBounds.startInclusive.toISOString();
  const endIso = dailyBounds.endExclusive.toISOString();

  // Only logs inside today's window — never the full tracker history. Paginated
  // so a high-volume day cannot silently truncate at the 1000-row ceiling.
  let logRows: DbPeriodLogRow[];
  try {
    logRows = await fetchAllPages<DbPeriodLogRow>(async (from, to) => {
      const { data, error } = await authedDb
        .from('tracker_logs')
        .select('tracker_id, value, logged_at')
        .in('tracker_id', trackerIds)
        .gte('logged_at', startIso)
        .lt('logged_at', endIso)
        .order('logged_at', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to);
      return { data: data as DbPeriodLogRow[] | null, error };
    });
  } catch (error) {
    console.error('[due-today] tracker_logs fetch error', error);
    return Response.json({ error: 'Failed to fetch completion logs' }, { status: 500 });
  }

  const logsByTracker = new Map<string, TrackerPeriodLog[]>();
  for (const row of logRows) {
    const list = logsByTracker.get(row.tracker_id) ?? [];
    list.push({
      value: typeof row.value === 'number' ? row.value : Number(row.value ?? 0),
      loggedAt: new Date(row.logged_at),
    });
    logsByTracker.set(row.tracker_id, list);
  }

  const goalMap = new Map<string, DueTodayGoalGroup>();
  for (const row of rows) {
    const goalTitle = row.goals?.title ?? '';
    if (!goalMap.has(row.goal_id)) {
      goalMap.set(row.goal_id, { goalId: row.goal_id, goalTitle, trackers: [] });
    }
    const type = row.type as TrackerType;
    const state = deriveDueTodayState(
      { type, targetValue: row.target_value },
      logsByTracker.get(row.id) ?? [],
      timezone,
      asOf,
    );
    goalMap.get(row.goal_id)!.trackers.push({
      id: row.id,
      title: row.title,
      type,
      targetValue: row.target_value,
      targetUnit: row.target_unit,
      currentPeriodValue: state.currentPeriodValue,
      isCompletedThisPeriod: state.isCompletedThisPeriod,
      periodEndExclusive: state.periodEndExclusive.toISOString(),
    });
  }

  return Response.json({ data: Array.from(goalMap.values()) });
}
