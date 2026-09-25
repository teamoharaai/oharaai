import { withAuth } from '@/lib/api/auth';
import { createAuthedClient } from '@/lib/db/client';
import { manualGoalHTTP } from '@/lib/goals/manual-v1-http';

const authedHandler = withAuth(async (request, _params, auth) => {
  const db = createAuthedClient(auth.accessToken);
  return manualGoalHTTP(request, async (action, payload) => {
    const { data, error } = await db.rpc('goal_manual_v1', { action, payload });
    if (error) throw new Error('Goal contract unavailable');
    return data;
  });
}, {
  onUnauthorized: () => Response.json({ok:false,error:{code:'UNAUTHORIZED'}},{status:401}),
  onUnavailable: () => Response.json({ok:false,error:{code:'AUTH_UNAVAILABLE'}},{status:503,headers:{'Retry-After':'2'}}),
});
async function handler(request: Request, params: Record<string,string> = {}) {
  const response = await authedHandler(request, params);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
export const GET = handler;
export const POST = handler;
