import { withAuth, type AuthContext } from '@/lib/api/auth';
import { createAuthedClient } from '@/lib/db/client';
import {
  createGoalWithMilestonesAndTrackers,
  type ManualGoalCreationInput,
} from '@/lib/db/goals';
import type { ApiResponse } from '@/lib/api/contracts';
import {
  GOAL_CATEGORIES,
  GOAL_SMART_KEYS,
  GOAL_TRACKER_FREQUENCIES,
  GOAL_TRACKER_TYPES,
  GOAL_VISIBILITIES,
  type GoalCategory,
  type GoalTrackerFrequency,
  type GoalTrackerType,
  type GoalVisibility,
} from '@/lib/goals/schema';

const TARGET_FREQUENCY_PERIODS = ['day', 'week', 'month'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateOptionalNullableString(
  obj: Record<string, unknown>,
  key: string,
): string | null {
  const value = obj[key];
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') throw new Error(`${key} must be a string or null`);
  return value;
}

function validateOptionalDate(value: unknown, field: string): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') throw new Error(`${field} must be a date string or null`);

  const trimmed = value.trim();
  if (!trimmed) return null;
  if (Number.isNaN(new Date(trimmed).getTime())) {
    throw new Error(`${field} must be a parseable date`);
  }
  return trimmed;
}

function validateOptionalSmartData(
  value: unknown,
): ManualGoalCreationInput['smart_data'] {
  if (value === undefined || value === null) return null;
  if (!isRecord(value)) {
    throw new Error('smart_data must be an object or null');
  }
  const keys = Object.keys(value);
  if (keys.length !== GOAL_SMART_KEYS.length || !GOAL_SMART_KEYS.every((key) => key in value)) {
    throw new Error(`smart_data must contain exactly: ${GOAL_SMART_KEYS.join(', ')}`);
  }
  for (const key of GOAL_SMART_KEYS) {
    if (typeof value[key] !== 'string') {
      throw new Error(`smart_data.${key} must be a string`);
    }
  }
  return {
    specific: value.specific as string,
    measurable: value.measurable as string,
    achievable: value.achievable as string,
    relevant: value.relevant as string,
    timeBound: value.timeBound as string,
  };
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
  if (!GOAL_VISIBILITIES.includes(value.visibility as GoalVisibility)) {
    throw new Error(`visibility must be one of: ${GOAL_VISIBILITIES.join(', ')}`);
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
    return {
      title: milestone.title.trim(),
      description: validateOptionalNullableString(milestone, 'description'),
      dueDate: validateOptionalDate(milestone.dueDate, `milestones[${index}].dueDate`),
    };
  });

  if (!Array.isArray(value.trackers)) {
    throw new Error('trackers must be an array');
  }
  const trackers = value.trackers.map((tracker, index) => {
    if (!isRecord(tracker)) throw new Error(`trackers[${index}] must be an object`);
    if (typeof tracker.title !== 'string' || tracker.title.trim() === '') {
      throw new Error(`trackers[${index}].title must be a non-empty string`);
    }
    if (!GOAL_TRACKER_TYPES.includes(tracker.type as GoalTrackerType)) {
      throw new Error(
        `trackers[${index}].type must be one of: ${GOAL_TRACKER_TYPES.join(', ')}`,
      );
    }
    if (!GOAL_TRACKER_FREQUENCIES.includes(tracker.frequency as GoalTrackerFrequency)) {
      throw new Error(
        `trackers[${index}].frequency must be one of: ${GOAL_TRACKER_FREQUENCIES.join(', ')}`,
      );
    }

    const targetValue = tracker.targetValue === undefined ? null : tracker.targetValue;
    const targetUnit = tracker.targetUnit === undefined ? null : tracker.targetUnit;
    if (targetValue !== null && (typeof targetValue !== 'number' || !Number.isFinite(targetValue))) {
      throw new Error(`trackers[${index}].targetValue must be a finite number or null`);
    }
    if (targetUnit !== null && typeof targetUnit !== 'string') {
      throw new Error(`trackers[${index}].targetUnit must be a string or null`);
    }
    if (tracker.type === 'counter') {
      if (typeof targetValue !== 'number' || targetValue <= 0) {
        throw new Error(`trackers[${index}].targetValue must be greater than 0 for counters`);
      }
      if (typeof targetUnit !== 'string' || targetUnit.trim() === '') {
        throw new Error(`trackers[${index}].targetUnit is required for counters`);
      }
    }
    if (tracker.type === 'checklist' && (targetValue !== null || targetUnit !== null)) {
      throw new Error(`trackers[${index}] checklist target fields must be null`);
    }

    return {
      title: tracker.title.trim(),
      type: tracker.type as GoalTrackerType,
      targetValue: targetValue as number | null,
      targetUnit: typeof targetUnit === 'string' ? targetUnit.trim() || null : null,
      frequency: tracker.frequency as GoalTrackerFrequency,
    };
  });

  return {
    title: value.title.trim(),
    description: validateOptionalNullableString(value, 'description'),
    deadline: validateDeadline(value.deadline),
    category: value.category as GoalCategory,
    visibility: value.visibility as GoalVisibility,
    target_frequency: targetFrequency,
    project_id: validateOptionalNullableString(value, 'project_id'),
    smart_data: validateOptionalSmartData(value.smart_data),
    milestones,
    trackers,
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
    const result = await createGoalWithMilestonesAndTrackers(
      auth.userId,
      input,
      { origin: 'manual' },
      authedDb,
    );
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
