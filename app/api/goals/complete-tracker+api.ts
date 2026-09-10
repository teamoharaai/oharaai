import { withAuth, type AuthContext } from '@/lib/api/auth';
import {
  iosError,
  iosJSON,
  iosRequestContext,
  logIosRouteFailure,
  type IosRequestContext,
} from '@/lib/api/ios-contract';
import { createAuthedClient, isDatabaseConfigured } from '@/lib/db/client';
import { completeTracker, GoalExtensionError } from '@/lib/db/goals';

type CompleteTrackerRequest = {
  trackerId?: string;
  goalId?: string;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request): Promise<Response> {
  const context = iosRequestContext(request);
  if (!isDatabaseConfigured) {
    return iosError(context, 503, 'SERVICE_UNAVAILABLE', 'Service unavailable');
  }
  return withAuth(
    (innerRequest, params, auth) => handlePost(innerRequest, params, auth, context),
    { onUnauthorized: () => iosError(context, 401, 'UNAUTHORIZED', 'Unauthorized') },
  )(request);
}

async function handlePost(
  request: Request,
  _params: Record<string, string>,
  auth: AuthContext,
  context: IosRequestContext,
): Promise<Response> {
  const authedDb = createAuthedClient(auth.accessToken);

  let body: CompleteTrackerRequest;
  try {
    body = (await request.json()) as CompleteTrackerRequest;
  } catch {
    return iosError(context, 400, 'INVALID_INPUT', 'Invalid JSON body');
  }

  const trackerId = body.trackerId?.trim();
  const goalId = body.goalId?.trim();

  if (!trackerId || !goalId || !UUID_PATTERN.test(trackerId) || !UUID_PATTERN.test(goalId)) {
    return iosError(context, 422, 'UNPROCESSABLE', 'trackerId and goalId must be UUIDs');
  }

  try {
    await completeTracker(trackerId, goalId, auth.userId, authedDb);
    return iosJSON(context, { success: true });
  } catch (error) {
    if (error instanceof GoalExtensionError) {
      if (error.code === 'GOAL_HAS_SUCCESSOR') {
        return iosError(context, 409, 'CONFLICT', 'Goal is read-only');
      }
      if (error.code === 'GOAL_NOT_FOUND') {
        return iosError(context, 404, 'NOT_FOUND', 'Goal or tracker not found');
      }
    }

    logIosRouteFailure('tracker_complete_failed', context, 500, error);
    return iosError(context, 500, 'INTERNAL_ERROR', 'Failed to complete tracker');
  }
}
