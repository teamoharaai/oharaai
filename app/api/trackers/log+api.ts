import { withAuth, type AuthContext } from '@/lib/api/auth';
import { createAuthedClient, isDatabaseConfigured } from '@/lib/db/client';
import { logTrackerMutation } from '@/lib/db/goals';
import {
  TRACKER_LOG_ACTIONS,
  TrackerMutationError,
  trackerMutationErrorStatus,
  type TrackerLogAction,
} from '@/lib/db/tracker-mutations';

type TrackerLogRequest = {
  trackerId?: string;
  goalId?: string;
  action?: string;
  value?: number;
};

function isTrackerLogAction(value: string): value is TrackerLogAction {
  return (TRACKER_LOG_ACTIONS as readonly string[]).includes(value);
}

export async function POST(request: Request): Promise<Response> {
  if (!isDatabaseConfigured) {
    return Response.json({ error: 'Database not configured' }, { status: 503 });
  }
  return withAuth(handlePost)(request);
}

async function handlePost(
  request: Request,
  _params: Record<string, string>,
  auth: AuthContext,
): Promise<Response> {
  const authedDb = createAuthedClient(auth.accessToken);

  let body: TrackerLogRequest;
  try {
    body = (await request.json()) as TrackerLogRequest;
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const trackerId = body.trackerId?.trim();
  const goalId = body.goalId?.trim();
  const action = body.action?.trim();

  if (!trackerId || !goalId || !action) {
    return Response.json(
      { error: 'trackerId, goalId, and action are required' },
      { status: 400 },
    );
  }
  if (!isTrackerLogAction(action)) {
    return Response.json({ error: `Unsupported action: ${action}` }, { status: 400 });
  }

  try {
    const result = await logTrackerMutation(
      { action, trackerId, goalId, userId: auth.userId, value: body.value },
      authedDb,
    );
    return Response.json(result);
  } catch (error) {
    if (error instanceof TrackerMutationError) {
      return Response.json(
        { error: error.message },
        { status: trackerMutationErrorStatus(error.code) },
      );
    }
    const message = error instanceof Error ? error.message : 'Failed to log tracker';
    return Response.json({ error: message }, { status: 500 });
  }
}
