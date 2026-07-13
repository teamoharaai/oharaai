import { withAuth, type AuthContext } from '@/lib/api/auth';
import { createAuthedClient } from '@/lib/db/client';
import {
  createGoalWithMeasurables,
  type ManualGoalCreationInput,
} from '@/lib/db/goals';
import type { ApiResponse } from '@/lib/api/contracts';
import {
  GOAL_CATEGORIES,
  GOAL_MEASURABLE_TYPES,
  type GoalCategory,
  type GoalMeasurableType,
} from '@/lib/goals/schema';

const TARGET_FREQUENCY_PERIODS = ['day', 'week', 'month'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateOptionalNullableString(
  obj: Record<string, unknown>,
  key: 'description' | 'project_id',
): string | null {
  const value = obj[key];
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') throw new Error(`${key} must be a string or null`);
  return value;
}

function validateDeadline(value: unknown): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error('deadline must be a non-empty date string');
  }

  const trimmed = value.trim();
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('deadline must be a parseable date');
  }

  const dateOnlyMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const deadlineDay = dateOnlyMatch
    ? new Date(
        Number(dateOnlyMatch[1]),
        Number(dateOnlyMatch[2]) - 1,
        Number(dateOnlyMatch[3]),
      )
    : new Date(parsed);
  deadlineDay.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (deadlineDay.getTime() < today.getTime()) {
    throw new Error('deadline must not be in the past');
  }

  return trimmed;
}

function validateManualGoalCreationInput(value: unknown): ManualGoalCreationInput {
  if (!isRecord(value)) throw new Error('Goal payload must be a JSON object');
  if ('vault_context' in value) throw new Error('vault_context is not accepted on manual goal creation');

  if (typeof value.title !== 'string' || value.title.trim() === '') {
    throw new Error('title must be a non-empty string');
  }
  if (!GOAL_CATEGORIES.includes(value.category as GoalCategory)) {
    throw new Error(`category must be one of: ${GOAL_CATEGORIES.join(', ')}`);
  }

  let targetFrequency: ManualGoalCreationInput['target_frequency'];
  if (value.target_frequency === null) {
    targetFrequency = null;
  } else {
    if (!isRecord(value.target_frequency)) {
      throw new Error('target_frequency must be an object or null');
    }
    const { times, period } = value.target_frequency;
    if (typeof times !== 'number' || !Number.isFinite(times) || times < 1) {
      throw new Error('target_frequency.times must be a number greater than or equal to 1');
    }
    if (!TARGET_FREQUENCY_PERIODS.includes(period as typeof TARGET_FREQUENCY_PERIODS[number])) {
      throw new Error(`target_frequency.period must be one of: ${TARGET_FREQUENCY_PERIODS.join(', ')}`);
    }
    targetFrequency = {
      times,
      period: period as typeof TARGET_FREQUENCY_PERIODS[number],
    };
  }

  if (!Array.isArray(value.milestones)) {
    throw new Error('milestones must be an array');
  }
  const milestones = value.milestones.map((milestone, index) => {
    if (!isRecord(milestone)) throw new Error(`milestones[${index}] must be an object`);
    if (typeof milestone.title !== 'string' || milestone.title.trim() === '') {
      throw new Error(`milestones[${index}].title must be a non-empty string`);
    }
    if (!GOAL_MEASURABLE_TYPES.includes(milestone.type as GoalMeasurableType)) {
      throw new Error(
        `milestones[${index}].type must be one of: ${GOAL_MEASURABLE_TYPES.join(', ')}`,
      );
    }
    return {
      title: milestone.title.trim(),
      type: milestone.type as GoalMeasurableType,
    };
  });

  return {
    title: value.title.trim(),
    description: validateOptionalNullableString(value, 'description'),
    deadline: validateDeadline(value.deadline),
    category: value.category as GoalCategory,
    target_frequency: targetFrequency,
    project_id: validateOptionalNullableString(value, 'project_id'),
    milestones,
  };
}

function unauthorizedResponse(): Response {
  const errBody: ApiResponse<never> = {
    ok: false,
    data: null,
    error: { code: 'UNAUTHORIZED', message: 'Unauthorized' },
  };
  return Response.json(errBody, { status: 401 });
}

export async function POST(request: Request): Promise<Response> {
  return withAuth(handlePost, { onUnauthorized: unauthorizedResponse })(request);
}

async function handlePost(request: Request, _params: Record<string, string>, auth: AuthContext): Promise<Response> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    const errBody: ApiResponse<never> = {
      ok: false,
      data: null,
      error: { code: 'INVALID_INPUT', message: 'Invalid JSON body' },
    };
    return Response.json(errBody, { status: 400 });
  }

  let input: ManualGoalCreationInput;
  try {
    input = validateManualGoalCreationInput(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid goal payload';
    const errBody: ApiResponse<never> = {
      ok: false,
      data: null,
      error: { code: 'INVALID_INPUT', message },
    };
    return Response.json(errBody, { status: 400 });
  }

  const authedDb = createAuthedClient(auth.accessToken);

  try {
    const result = await createGoalWithMeasurables(auth.userId, input, undefined, authedDb);
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
