import { getAuthContext } from '@/lib/api/auth';
import { createAuthedClient } from '@/lib/db/client';
import { createGoalWithMeasurables } from '@/lib/db/goals';
import { validateGoalFinalizeResponse } from '@/lib/ai/schemas/goal-creation';
import type { ApiResponse } from '@/lib/api/contracts';

interface CreateGoalRequestBody {
  aiData: unknown;
  options?: { requestId?: string; projectId?: string | null };
}

export async function POST(request: Request): Promise<Response> {
  const auth = await getAuthContext(request);
  if (!auth) {
    const errBody: ApiResponse<never> = {
      ok: false,
      data: null,
      error: { code: 'UNAUTHORIZED', message: 'Unauthorized' },
    };
    return Response.json(errBody, { status: 401 });
  }

  let payload: CreateGoalRequestBody;
  try {
    payload = (await request.json()) as CreateGoalRequestBody;
  } catch {
    const errBody: ApiResponse<never> = {
      ok: false,
      data: null,
      error: { code: 'INVALID_INPUT', message: 'Invalid JSON body' },
    };
    return Response.json(errBody, { status: 400 });
  }

  let aiData;
  try {
    aiData = validateGoalFinalizeResponse(payload.aiData);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid aiData payload';
    const errBody: ApiResponse<never> = {
      ok: false,
      data: null,
      error: { code: 'INVALID_INPUT', message },
    };
    return Response.json(errBody, { status: 400 });
  }

  const authedDb = createAuthedClient(auth.accessToken);

  try {
    const result = await createGoalWithMeasurables(auth.userId, aiData, payload.options, authedDb);
    const body: ApiResponse<typeof result> = { ok: true, data: result, error: null };
    return Response.json(body, { status: 201 });
  } catch (err) {
    const errBody: ApiResponse<never> = {
      ok: false,
      data: null,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create goal',
        details: err instanceof Error ? err.message : undefined,
      },
    };
    return Response.json(errBody, { status: 500 });
  }
}
