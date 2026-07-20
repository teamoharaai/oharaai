import { withAuth, type AuthContext } from '@/lib/api/auth';
import type { ApiResponse } from '@/lib/api/contracts';
import { createAuthedClient } from '@/lib/db/client';
import {
  cloneGoalWithMilestonesAndTrackers,
  GoalExtensionError,
} from '@/lib/db/goals';

interface ExtendGoalInput {
  deadline: string;
  title?: string;
  reflection?: string;
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
  const parsedDeadline = new Date(deadline);
  if (Number.isNaN(parsedDeadline.getTime())) {
    throw new Error('deadline must be a parseable date');
  }
  if (parsedDeadline.getTime() <= Date.now()) {
    throw new Error('deadline must be in the future');
  }

  if (value.title !== undefined && typeof value.title !== 'string') {
    throw new Error('title must be a string');
  }
  if (value.reflection !== undefined && typeof value.reflection !== 'string') {
    throw new Error('reflection must be a string');
  }

  return { deadline, title: value.title, reflection: value.reflection };
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
    const result = await cloneGoalWithMilestonesAndTrackers(
      goalId,
      auth.userId,
      input.deadline,
      authedDb,
      input.title,
      input.reflection,
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
        error: {
          code,
          message: error.code === 'GOAL_ALREADY_EXTENDED'
            ? 'This goal has already been extended.'
            : error.message,
        },
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
