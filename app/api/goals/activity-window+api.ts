import { createAuthedClient, isDatabaseConfigured } from '@/lib/db/client';
import { withAuth, type AuthContext } from '@/lib/api/auth';
import { fetchGoalActivityEvents, fetchProfileTimezone } from '@/lib/db/goal-activity';
import { buildActivityWindow, type GoalActivityKind } from '@/lib/activity/goal-activity';
import { addLocalDays, localDateForInstant } from '@/lib/time/zoned-calendar';

const DEFAULT_DAYS = 7;
const MAX_DAYS = 120; // heatmap ceiling; keeps the window bounded (Phase C uses this)
const PHASE_B_SOURCES: readonly GoalActivityKind[] = ['task_completed'];

export async function GET(request: Request): Promise<Response> {
  if (!isDatabaseConfigured) {
    return Response.json({ error: 'Database not configured' }, { status: 503 });
  }
  return withAuth(handleGet)(request);
}

async function handleGet(request: Request, _params: Record<string, string>, auth: AuthContext): Promise<Response> {
  const url = new URL(request.url);
  const goalId = url.searchParams.get('goalId');
  if (!goalId) {
    return Response.json({ error: 'goalId is required' }, { status: 400 });
  }

  const requestedDays = Number.parseInt(url.searchParams.get('days') ?? '', 10);
  const days = Number.isFinite(requestedDays)
    ? Math.min(MAX_DAYS, Math.max(1, requestedDays))
    : DEFAULT_DAYS;

  const authedDb = createAuthedClient(auth.accessToken);
  const timezone = await fetchProfileTimezone(authedDb, auth.userId);
  const asOfLocalDate = localDateForInstant(new Date().toISOString(), timezone);
  const sinceLocalDate = addLocalDays(asOfLocalDate, -(days - 1));

  const events = await fetchGoalActivityEvents(authedDb, auth.userId, goalId, {
    sinceLocalDate,
    profileTimezone: timezone,
    sources: PHASE_B_SOURCES,
  });
  const buckets = buildActivityWindow(events, { asOfLocalDate, days });
  return Response.json({ buckets });
}
