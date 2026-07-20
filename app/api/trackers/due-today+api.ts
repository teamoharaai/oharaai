import { withAuth, type AuthContext } from '@/lib/api/auth';
import { createAuthedClient, isDatabaseConfigured } from '@/lib/db/client';

type TrackerType = 'counter' | 'habit' | 'checklist';

interface DueTodayTracker {
  id: string;
  title: string;
  type: TrackerType;
  targetValue: number | null;
  targetUnit: string | null;
  currentValue: number;
  lastCompletedAt: string | null;
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
  current_value: number;
  goal_id: string;
  goals: { title: string } | null;
}

interface DbLastLogRow {
  tracker_id: string;
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

  const { data: trackerRows, error: trackersError } = await authedDb
    .from('trackers')
    .select('id, title, type, target_value, target_unit, current_value, goal_id, goals!inner(title)')
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
  const { data: logRows, error: logsError } = await authedDb
    .from('tracker_logs')
    .select('tracker_id, logged_at')
    .in('tracker_id', trackerIds)
    .order('logged_at', { ascending: false });

  if (logsError) {
    console.error('[due-today] tracker_logs fetch error', logsError);
    return Response.json({ error: 'Failed to fetch completion logs' }, { status: 500 });
  }

  const lastCompletedMap = new Map<string, string>();
  for (const log of (logRows ?? []) as DbLastLogRow[]) {
    if (!lastCompletedMap.has(log.tracker_id)) {
      lastCompletedMap.set(log.tracker_id, log.logged_at);
    }
  }

  const goalMap = new Map<string, DueTodayGoalGroup>();
  for (const row of rows) {
    const goalTitle = row.goals?.title ?? '';
    if (!goalMap.has(row.goal_id)) {
      goalMap.set(row.goal_id, { goalId: row.goal_id, goalTitle, trackers: [] });
    }
    goalMap.get(row.goal_id)!.trackers.push({
      id: row.id,
      title: row.title,
      type: row.type as TrackerType,
      targetValue: row.target_value,
      targetUnit: row.target_unit,
      currentValue: row.current_value,
      lastCompletedAt: lastCompletedMap.get(row.id) ?? null,
    });
  }

  return Response.json({ data: Array.from(goalMap.values()) });
}
