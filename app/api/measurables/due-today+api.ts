import supabase, { createAuthedClient, isDatabaseConfigured } from '@/lib/db/client';

type MeasurableType = 'counter' | 'habit' | 'checklist';

interface DueTodayMeasurable {
  id: string;
  title: string;
  type: MeasurableType;
  targetValue: number | null;
  targetUnit: string | null;
  currentValue: number;
  lastCompletedAt: string | null;
}

interface DueTodayGoalGroup {
  goalId: string;
  goalTitle: string;
  measurables: DueTodayMeasurable[];
}

interface DbMeasurableRow {
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
  measurable_id: string;
  logged_at: string;
}

export async function GET(request: Request): Promise<Response> {
  if (!isDatabaseConfigured) {
    return Response.json({ error: 'Database not configured' }, { status: 503 });
  }

  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const authedDb = createAuthedClient(token);

  // Fetch all daily measurables on active goals for this user
  const { data: measurableRows, error: measurablesError } = await authedDb
    .from('measurables')
    .select('id, title, type, target_value, target_unit, current_value, goal_id, goals!inner(title)')
    .eq('frequency', 'daily')
    .eq('goals.status', 'active')
    .eq('goals.user_id', user.id);

  if (measurablesError) {
    console.error('[due-today] measurables fetch error', measurablesError);
    return Response.json({ error: 'Failed to fetch measurables' }, { status: 500 });
  }

  const rows = (measurableRows ?? []) as unknown as DbMeasurableRow[];

  if (rows.length === 0) {
    return Response.json({ data: [] });
  }

  const measurableIds = rows.map((r) => r.id);

  // Fetch last completion timestamp for each measurable
  const { data: logRows, error: logsError } = await authedDb
    .from('measurable_logs')
    .select('measurable_id, logged_at')
    .in('measurable_id', measurableIds)
    .order('logged_at', { ascending: false });

  if (logsError) {
    console.error('[due-today] measurable_logs fetch error', logsError);
    return Response.json({ error: 'Failed to fetch completion logs' }, { status: 500 });
  }

  // Build a map: measurable_id → most recent logged_at
  const lastCompletedMap = new Map<string, string>();
  for (const log of (logRows ?? []) as DbLastLogRow[]) {
    if (!lastCompletedMap.has(log.measurable_id)) {
      lastCompletedMap.set(log.measurable_id, log.logged_at);
    }
  }

  // Group measurables by goal
  const goalMap = new Map<string, DueTodayGoalGroup>();
  for (const row of rows) {
    const goalTitle = row.goals?.title ?? '';
    if (!goalMap.has(row.goal_id)) {
      goalMap.set(row.goal_id, { goalId: row.goal_id, goalTitle, measurables: [] });
    }
    goalMap.get(row.goal_id)!.measurables.push({
      id: row.id,
      title: row.title,
      type: row.type as MeasurableType,
      targetValue: row.target_value,
      targetUnit: row.target_unit,
      currentValue: row.current_value,
      lastCompletedAt: lastCompletedMap.get(row.id) ?? null,
    });
  }

  return Response.json({ data: Array.from(goalMap.values()) });
}
