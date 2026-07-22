import { withAuth, type AuthContext } from '@/lib/api/auth';
import { createAuthedClient, isDatabaseConfigured } from '@/lib/db/client';
import { GOAL_CATEGORIES, type GoalCategory } from '@/lib/goals/schema';
import { CATEGORY_COLOR_THEME } from '@/constants/themes';
import {
  isRecord,
  optionalString,
  optionalUuid,
  requiredDate,
  requiredString,
} from '@/lib/sessions/schema';

type StartRpcRow = {
  session_id: string;
  project_id: string;
  goal_id: string;
  was_created: boolean;
};

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
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    if (!isRecord(body)) throw new Error('Session payload must be an object');

    const externalSessionId = requiredString(body.externalSessionId, 'externalSessionId', 200);
    const projectId = optionalUuid(body.projectId, 'projectId');
    const projectTitle = requiredString(body.projectTitle, 'projectTitle', 200);
    const projectDescription = optionalString(body.projectDescription, 'projectDescription', 2000);
    const periodKey = requiredString(body.periodKey, 'periodKey', 100);
    const startDate = requiredDate(body.startDate, 'startDate');
    const endDate = requiredDate(body.endDate, 'endDate');
    if (startDate > endDate) throw new Error('startDate must not be after endDate');

    const goalTitle = requiredString(body.goalTitle, 'goalTitle', 200);
    const goalDescription = optionalString(body.goalDescription, 'goalDescription', 4000);
    const goalCategory = body.goalCategory ?? 'creative';
    if (!GOAL_CATEGORIES.includes(goalCategory as GoalCategory)) {
      throw new Error(`goalCategory must be one of: ${GOAL_CATEGORIES.join(', ')}`);
    }

    const authedDb = createAuthedClient(auth.accessToken);
    const { data, error } = await authedDb.rpc('start_agent_session', {
      p_external_session_id: externalSessionId,
      p_project_id: projectId,
      p_project_title: projectTitle,
      p_project_description: projectDescription,
      p_period_key: periodKey,
      p_start_date: startDate,
      p_end_date: endDate,
      p_goal_title: goalTitle,
      p_goal_description: goalDescription,
      p_goal_category: goalCategory,
      p_goal_color_theme: CATEGORY_COLOR_THEME[goalCategory as GoalCategory],
    });

    if (error) throw error;
    const row = (data as StartRpcRow[] | null)?.[0];
    if (!row) throw new Error('Session transaction returned no result');

    return Response.json(
      {
        sessionId: row.session_id,
        projectId: row.project_id,
        goalId: row.goal_id,
        created: row.was_created,
      },
      { status: row.was_created ? 201 : 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to start session';
    const status = /not found/i.test(message) ? 404 : /must|required|invalid/i.test(message) ? 400 : 500;
    console.error('[sessions] start failed', { userId: auth.userId, error: message });
    return Response.json({ error: message }, { status });
  }
}
