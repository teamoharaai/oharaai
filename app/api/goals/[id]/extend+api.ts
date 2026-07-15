import { withAuth, type AuthContext } from '@/lib/api/auth';
import type { ApiResponse } from '@/lib/api/contracts';
import { createAuthedClient } from '@/lib/db/client';
import {
  cloneGoalWithMeasurables,
  GoalExtensionError,
} from '@/lib/db/goals';

interface ExtendGoalInput {
  deadline: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateExtendGoalInput(value: unknown): ExtendGoalInput {
  if (!isRecord(value)) {
    throw new Error('Extend goal payload must be a JSON object');
  }
  if (typeof value.deadline !== 'string' || value.deadline.trim() === '') {
    throw new Error('deadline must be a non-empty date string');
  }

  const deadline = value.deadline.trim();
  if (Number.isNaN(new Date(deadline).getTime())) {
    throw new Error('deadline must be a parseable date');
  }

  return { deadline };
}

function unauthorizedResponse(): Response {
  const body: ApiResponse<never> = {
    ok: false,
    data: null,
    error: { code: 'UNAUTHORIZED', message: 'Unauthorized' },
  };
  return Response.json(body, { status: 401 });
}

export async function POST(
  request: Request,
  params: Record<string, string>,
): Promise<Response> {
  return withAuth(handlePost, { onUnauthorized: unauthorizedResponse })(request, params);
}

async function handlePost(
  request: Request,
  params: Record<string, string>,
  auth: AuthContext,
): Promise<Response> {
  const goalId = params.id?.trim();
  if (!goalId) {
    const body: ApiResponse<never> = {
      ok: false,
      data: null,
      error: { code: 'INVALID_INPUT', message: 'Goal ID is required' },
    };
    return Response.json(body, { status: 400 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    const body: ApiResponse<never> = {
      ok: false,
      data: null,
      error: { code: 'INVALID_INPUT', message: 'Invalid JSON body' },
    };
    return Response.json(body, { status: 400 });
  }

  let input: ExtendGoalInput;
  try {
    input = validateExtendGoalInput(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid extend goal payload';
    const body: ApiResponse<never> = {
      ok: false,
      data: null,
      error: { code: 'INVALID_INPUT', message },
    };
    return Response.json(body, { status: 400 });
  }

  const authedDb = createAuthedClient(auth.accessToken);

  try {
    const result = await cloneGoalWithMeasurables(
      goalId,
      auth.userId,
      input.deadline,
      authedDb,
    );
    const body: ApiResponse<typeof result> = { ok: true, data: result, error: null };
    return Response.json(body, { status: 201 });
  } catch (error) {
    if (error instanceof GoalExtensionError) {
      const status = error.code === 'GOAL_NOT_FOUND'
        ? 404
        : error.code === 'GOAL_ALREADY_EXTENDED'
          ? 409
          : 400;
      const code = error.code === 'GOAL_NOT_FOUND'
        ? 'NOT_FOUND' as const
        : error.code === 'GOAL_ALREADY_EXTENDED'
          ? 'CONFLICT' as const
          : 'INVALID_INPUT' as const;
      const body: ApiResponse<never> = {
        ok: false,
        data: null,
        error: { code, message: error.message },
      };
      return Response.json(body, { status });
    }

    const body: ApiResponse<never> = {
      ok: false,
      data: null,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to extend goal',
        details: error instanceof Error ? error.message : undefined,
      },
    };
    return Response.json(body, { status: 500 });
  }
}
