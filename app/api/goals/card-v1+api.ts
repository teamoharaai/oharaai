import { withAuth } from '@/lib/api/auth';
import { createAuthedClient } from '@/lib/db/client';
import { goalCardHTTP } from '@/lib/goals/goal-card-v1-http';
import { goalRouteAuthResponses, privateNoStore } from '@/lib/goals/goal-route-http';

const handler = privateNoStore(withAuth(async (request, _params, auth) => {
  const db = createAuthedClient(auth.accessToken);
  return goalCardHTTP(request, async (action, payload) => {
    const { data, error } = await db.rpc('goal_card_v1', { action, payload });
    if (error) throw new Error('Goal Card contract unavailable');
    return data;
  });
}, goalRouteAuthResponses));
export const GET = handler;
export const POST = handler;
