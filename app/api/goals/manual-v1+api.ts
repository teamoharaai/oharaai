import { withAuth } from '@/lib/api/auth';
import { createAuthedClient } from '@/lib/db/client';
import { goalRouteAuthResponses, privateNoStore } from '@/lib/goals/goal-route-http';
import { manualGoalHTTP } from '@/lib/goals/manual-v1-http';

const handler = privateNoStore(withAuth(async (request, _params, auth) => {
  const db = createAuthedClient(auth.accessToken);
  return manualGoalHTTP(request, async (action, payload) => {
    const { data, error } = await db.rpc('goal_manual_v1', { action, payload });
    if (error) throw new Error('Goal contract unavailable');
    return data;
  });
}, goalRouteAuthResponses));
export const GET = handler;
export const POST = handler;
