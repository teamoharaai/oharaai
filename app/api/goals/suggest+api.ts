import { withAuth, type AuthContext } from '@/lib/api/auth';
import { callLLM } from '@/lib/ai/client';
import type { AiResponse } from '@/lib/ai/contracts';
import { isAIRateLimitError } from '@/lib/ai/errors';
import { GOAL_SUGGESTION_SYSTEM_PROMPT } from '@/lib/ai/prompts/goal-suggestion';
import type { ManualGoalCreationInput } from '@/lib/db/goals';
import {
  GOAL_MEASURABLE_TYPES,
  type GoalMeasurableType,
} from '@/lib/goals/schema';

type GoalSuggestion = ManualGoalCreationInput['milestones'][number];
type GoalSuggestionRequest = { title: string; why: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateRequest(value: unknown): GoalSuggestionRequest {
  if (!isRecord(value)) {
    throw new Error('Goal suggestion payload must be a JSON object');
  }

  const keys = Object.keys(value);
  if (keys.length !== 2 || !keys.includes('title') || !keys.includes('why')) {
    throw new Error('Goal suggestion payload must contain only title and why');
  }
  if (typeof value.title !== 'string') {
    throw new Error('title must be a string');
  }
  if (typeof value.why !== 'string') {
    throw new Error('why must be a string');
  }

  return { title: value.title, why: value.why };
}

function parseSuggestion(rawText: string): GoalSuggestion {
  const value: unknown = JSON.parse(rawText);
  if (!isRecord(value)) {
    throw new Error('Goal suggestion response must be a JSON object');
  }

  const keys = Object.keys(value);
  if (keys.length !== 2 || !keys.includes('title') || !keys.includes('type')) {
    throw new Error('Goal suggestion response must contain only title and type');
  }
  if (typeof value.title !== 'string' || value.title.trim() === '') {
    throw new Error('Goal suggestion title must be a non-empty string');
  }
  if (!GOAL_MEASURABLE_TYPES.includes(value.type as GoalMeasurableType)) {
    throw new Error(
      `Goal suggestion type must be one of: ${GOAL_MEASURABLE_TYPES.join(', ')}`,
    );
  }

  return {
    title: value.title.trim(),
    type: value.type as GoalMeasurableType,
  };
}

function unauthorizedResponse(): Response {
  const body: AiResponse<never> = {
    ok: false,
    data: null,
    error: { code: 'UNAUTHORIZED', message: 'Unauthorized' },
  };
  return Response.json(body, { status: 401 });
}

function failSoftResponse(): Response {
  const body: AiResponse<GoalSuggestion | null> = {
    ok: true,
    data: null,
    error: null,
  };
  return Response.json(body);
}

export async function POST(request: Request): Promise<Response> {
  return withAuth(handlePost, { onUnauthorized: unauthorizedResponse })(request);
}

async function handlePost(
  request: Request,
  _params: Record<string, string>,
  auth: AuthContext,
): Promise<Response> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    const body: AiResponse<never> = {
      ok: false,
      data: null,
      error: { code: 'INVALID_INPUT', message: 'Invalid JSON body' },
    };
    return Response.json(body, { status: 400 });
  }

  let input: GoalSuggestionRequest;
  try {
    input = validateRequest(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid goal suggestion payload';
    const body: AiResponse<never> = {
      ok: false,
      data: null,
      error: { code: 'INVALID_INPUT', message },
    };
    return Response.json(body, { status: 400 });
  }

  let result;
  try {
    result = await callLLM({
      pipeline: 'goalSuggestion',
      userId: auth.userId,
      accessToken: auth.accessToken,
      systemPrompt: GOAL_SUGGESTION_SYSTEM_PROMPT,
      userMessage: JSON.stringify(input),
      assistantPrefill: '{',
    });
  } catch (error) {
    if (isAIRateLimitError(error)) {
      const body: AiResponse<never> = {
        ok: false,
        data: null,
        error: { code: 'RATE_LIMITED', message: error.message },
      };
      return Response.json(body, { status: 429 });
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[goals/suggest] AI call failed:', message);
    return failSoftResponse();
  }

  let suggestion: GoalSuggestion;
  try {
    suggestion = parseSuggestion(result.text);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown parse error';
    console.error('[goals/suggest] AI response parse failed:', message);
    return failSoftResponse();
  }

  const body: AiResponse<GoalSuggestion> = {
    ok: true,
    data: suggestion,
    error: null,
  };
  return Response.json(body);
}
