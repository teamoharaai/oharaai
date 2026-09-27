import { withAuth } from '@/lib/api/auth';
import { createAuthedClient } from '@/lib/db/client';
import { goalRouteAuthResponses, privateNoStore } from '@/lib/goals/goal-route-http';
import { goalWorkHTTP } from '@/lib/goals/goal-work-v1-http';

const handler = privateNoStore(withAuth(async (request, _params, auth) => {
  const db = createAuthedClient(auth.accessToken);
  return goalWorkHTTP(request, async (action, payload) => {
    const { data, error } = await db.rpc('goal_work_v1', { action, payload });
    if (error) throw new Error('Goal work contract unavailable');
    return data;
  });
}, goalRouteAuthResponses));
export const GET = handler;
export const POST = handler;
