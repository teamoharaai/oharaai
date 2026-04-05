import { callLLM } from '@/lib/ai/client';
import {
  isAIRateLimitError,
} from '@/lib/ai/errors';
import type { AiResponse } from '@/lib/ai/contracts';
import {
  GOAL_CREATION_SYSTEM_PROMPT,
  GOAL_CREATION_FINALIZE_PROMPT,
  GOAL_CREATION_FINALIZE_RETRY_PROMPT,
} from '@/lib/ai/prompts/goal-creation';
import {
  parseGoalFinalizeResponse,
  type GoalFinalizeResponse,
} from '@/lib/ai/schemas/goal-creation';
import supabase, { isDatabaseConfigured } from '@/lib/db/client';

type ConversationMessage = { role: 'user' | 'assistant'; content: string };

// userId must NEVER come from the request body — it must come from the session.
// It is intentionally excluded from this interface.
interface RequestBody {
  userMessage?: string;
  conversationHistory?: ConversationMessage[];
  finalize?: boolean;
  projectId?: string | null;
}

interface CreateResponse {
  requestId: string;
  message: string;
  isComplete: boolean;
  goalData?: GoalFinalizeResponse;
  finalizedBy?: 'assistant' | 'user';
}

async function getAuthContextFromRequest(request: Request) {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token || !isDatabaseConfigured) return null;

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  return error || !user ? null : { userId: user.id, accessToken: token };
}

function rateLimitedResponse(error: { message: string }): Response {
  const body: AiResponse<never> = {
    ok: false,
    data: null,
    error: { code: 'RATE_LIMITED', message: error.message },
  };
  return Response.json(body, { status: 429 });
}

// ─── Input sanitization ───────────────────────────────────────────────────────

const MAX_USER_MESSAGE_LENGTH = 4000;
const MAX_HISTORY_TURNS = 40;
const MAX_HISTORY_MESSAGE_LENGTH = 4000;

/** Strip null bytes and ASCII control chars (preserve newlines \n \r \t). */
function sanitizeString(input: unknown, maxLength: number): string {
  if (typeof input !== 'string') throw new Error('Expected string');
  const cleaned = input
    .replace(/\0/g, '')
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  const trimmed = cleaned.trim();
  if (trimmed.length === 0) throw new Error('Value cannot be empty');
  if (trimmed.length > maxLength) throw new Error(`Value exceeds ${maxLength} character limit`);
  return trimmed;
}

function sanitizeOptionalString(input: unknown, maxLength: number): string | null {
  if (input === undefined || input === null) return null;
  if (typeof input !== 'string') throw new Error('Expected string');
  const cleaned = input
    .replace(/\0/g, '')
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  const trimmed = cleaned.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > maxLength) throw new Error(`Value exceeds ${maxLength} character limit`);
  return trimmed;
}

function sanitizeHistory(raw: unknown): ConversationMessage[] {
  if (!Array.isArray(raw)) throw new Error('conversationHistory must be an array');
  if (raw.length > MAX_HISTORY_TURNS) throw new Error('conversationHistory exceeds maximum turns');
  return raw.map((item, i) => {
    if (!item || typeof item !== 'object') throw new Error(`History item ${i} is invalid`);
    const { role, content } = item as Record<string, unknown>;
    if (role !== 'user' && role !== 'assistant') throw new Error(`History item ${i} has invalid role`);
    return {
      role,
      content: sanitizeString(content, MAX_HISTORY_MESSAGE_LENGTH),
    };
  });
}

// ─── Route handler ────────────────────────────────────────────────────────────

const FINALIZE_SENTINEL = '[[GOAL_READY]]';
const INTERNAL_MARKER_PATTERN = /\[\[[A-Z0-9_:-]+\]\]/g;
const FINALIZE_OUTPUT_DEBUG_PREVIEW = 1200;
const FINALIZE_ASSISTANT_PREFILL = '{';

function createRequestId() {
  return `goal-create-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function stripFinalizeSentinel(message: string) {
  return message.replace(FINALIZE_SENTINEL, '').trim();
}

function shouldFinalize(message: string) {
  return message.includes(FINALIZE_SENTINEL);
}

type FinalizeTrigger = 'assistant' | 'user';
type GoalFinalizeStage =
  | 'transcript_preparation'
  | 'model_call'
  | 'model_response_missing'
  | 'json_parse'
  | 'schema_validation';

class GoalFinalizationError extends Error {
  stage: GoalFinalizeStage;
  attempt: number;
  rawPreview: string;
  retryable: boolean;
  debug?: Record<string, unknown>;

  constructor(
    message: string,
    options: {
      stage: GoalFinalizeStage;
      attempt: number;
      rawPreview: string;
      retryable?: boolean;
      debug?: Record<string, unknown>;
    },
  ) {
    super(message);
    this.name = 'GoalFinalizationError';
    this.stage = options.stage;
    this.attempt = options.attempt;
    this.rawPreview = options.rawPreview;
    this.retryable = options.retryable ?? false;
    this.debug = options.debug;
  }
}

function previewForLog(value: string | null | undefined, maxLength = 240) {
  if (!value) return null;
  return value.slice(0, maxLength);
}

function analyzeFinalizationOutput(raw: string) {
  const trimmed = raw.trim();
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');

  return {
    length: trimmed.length,
    startsWithBrace: trimmed.startsWith('{'),
    endsWithBrace: trimmed.endsWith('}'),
    hasCodeFence: trimmed.includes('```'),
    hasSentinel: trimmed.includes(FINALIZE_SENTINEL),
    hasInternalMarker: /\[\[[A-Z0-9_:-]+\]\]/.test(trimmed),
    firstBrace,
    lastBrace,
    leadingPreview: trimmed.slice(0, 120),
    trailingPreview: trimmed.slice(Math.max(0, trimmed.length - 120)),
  };
}

function extractEmbeddedJsonObject(raw: string): string | null {
  const trimmed = raw.trim();
  const start = trimmed.indexOf('{');

  if (start === -1) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < trimmed.length; index += 1) {
    const char = trimmed[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === '{') {
      depth += 1;
      continue;
    }

    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return trimmed.slice(start, index + 1);
      }
    }
  }

  return null;
}

function tryRepairFinalizationFormatting(raw: string): GoalFinalizeResponse | null {
  const extracted = extractEmbeddedJsonObject(raw);

  if (!extracted || extracted === raw.trim()) {
    return null;
  }

  try {
    return parseGoalFinalizeResponse(extracted);
  } catch {
    return null;
  }
}

function sanitizeTranscriptContent(content: string): { content: string; markersRemoved: number } {
  let markersRemoved = 0;
  const sanitized = content
    .replace(FINALIZE_SENTINEL, () => {
      markersRemoved += 1;
      return '';
    })
    .replace(INTERNAL_MARKER_PATTERN, () => {
      markersRemoved += 1;
      return '';
    })
    .trim();

  return { content: sanitized, markersRemoved };
}

function prepareFinalizeTranscript({
  history,
  requestId,
  trigger,
}: {
  history: ConversationMessage[];
  requestId: string;
  trigger: FinalizeTrigger;
}): string {
  try {
    let removedMarkers = 0;
    const lastAssistantIndex = [...history]
      .map((message, index) => ({ message, index }))
      .filter(({ message }) => message.role === 'assistant')
      .at(-1)?.index ?? -1;
    const sanitizedTurns = history
      .filter((message, index) => message.role === 'user' || index === lastAssistantIndex)
      .map((message) => {
        const sanitized = sanitizeTranscriptContent(message.content);
        removedMarkers += sanitized.markersRemoved;
        return {
          role: message.role,
          content: sanitized.content,
        };
      })
      .filter((message) => message.content.length > 0);

    if (sanitizedTurns.length === 0) {
      throw new Error('Finalization transcript is empty after sanitization');
    }

    const transcript = sanitizedTurns
      .map((message) => `${message.role === 'user' ? 'User' : 'Guide'}: ${message.content}`)
      .join('\n\n');

    console.info('[goal-finalize] transcript sanitized', {
      requestId,
      trigger,
      stage: 'transcript_preparation',
      inputTurns: history.length,
      sanitizedTurns: sanitizedTurns.length,
      lastAssistantIncluded: lastAssistantIndex !== -1,
      markersRemoved: removedMarkers,
      transcriptPreview: previewForLog(transcript),
    });

    return transcript;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Transcript preparation failed';
    console.error('[goal-finalize] transcript preparation failed', {
      requestId,
      trigger,
      stage: 'transcript_preparation',
      error: message,
    });
    throw new GoalFinalizationError(message, {
      stage: 'transcript_preparation',
      attempt: 0,
      rawPreview: '',
    });
  }
}

function buildFinalizeUserMessage(transcript: string) {
  return `Conversation transcript:

${transcript}

Return the final goal JSON now.`;
}

function buildFinalizeRetryUserMessage({
  transcript,
  previousOutput,
  parseError,
}: {
  transcript: string;
  previousOutput: string;
  parseError: string;
}) {
  return `Conversation transcript:

${transcript}

Your previous response was invalid.
Failure: ${parseError}

Previous invalid output:
${previousOutput}

Return the corrected JSON object only.`;
}

function isTimeoutErrorMessage(message: string) {
  return /\brequest timed out\b|\btimed out\b|\btimeout\b/i.test(message);
}

async function finalizeGoalFromTranscript({
  requestId,
  transcript,
  trigger,
  auth,
}: {
  requestId: string;
  transcript: string;
  trigger: FinalizeTrigger;
  auth: { userId: string; accessToken: string };
}): Promise<GoalFinalizeResponse> {
  let lastError: GoalFinalizationError | null = null;
  let previousOutput: string | null = null;
  let timeoutRetryUsed = false;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    if (attempt === 2) {
      console.info('[goal-finalize] retry started', {
        requestId,
        trigger,
        stage: 'json_parse',
        previousAttempt: lastError?.attempt ?? 1,
        previousError: lastError?.message ?? null,
      });
    }

    const systemPrompt = attempt === 1
      ? GOAL_CREATION_FINALIZE_PROMPT
      : GOAL_CREATION_FINALIZE_RETRY_PROMPT;
    const userContent = attempt === 1 || !previousOutput || !lastError
      ? buildFinalizeUserMessage(transcript)
      : buildFinalizeRetryUserMessage({
          transcript,
          previousOutput,
          parseError: lastError.message,
        });

    let finalResult;
    let modelCallAttempt = 0;
    while (!finalResult) {
      modelCallAttempt += 1;
      try {
        finalResult = await callLLM({
          pipeline: 'goalFinalize',
          userId: auth.userId,
          accessToken: auth.accessToken,
          systemPrompt,
          messages: [{ role: 'user', content: userContent }],
          assistantPrefill: FINALIZE_ASSISTANT_PREFILL,
          stopSequences: ['```'],
        });
      } catch (error) {
        if (isAIRateLimitError(error)) {
          throw error;
        }

        const message = error instanceof Error ? error.message : 'Finalization model call failed';
        const stage: GoalFinalizeStage = message.includes('no text content')
          ? 'model_response_missing'
          : 'model_call';
        const isTimeout = stage === 'model_call' && isTimeoutErrorMessage(message);

        if (isTimeout && !timeoutRetryUsed) {
          timeoutRetryUsed = true;
          console.warn('[goal-finalize] model call timeout, retrying once', {
            requestId,
            trigger,
            attempt,
            modelCallAttempt,
            stage,
            error: message,
          });
          continue;
        }

        console.error(stage === 'model_call' ? '[goal-finalize] model call failed' : '[goal-finalize] model response missing', {
          requestId,
          trigger,
          attempt,
          modelCallAttempt,
          stage,
          error: message,
          timeoutRetryUsed,
        });
        throw new GoalFinalizationError(message, {
          stage,
          attempt,
          rawPreview: '',
        });
      }
    }

    const responseText = finalResult.text.trim();
    const responseShape = analyzeFinalizationOutput(responseText);
    console.info('[goal-finalize] model response received', {
      requestId,
      trigger,
      attempt,
      model: finalResult.model,
      outputShape: responseShape,
      outputPreview: previewForLog(responseText),
    });

    if (!responseText) {
      const error = new GoalFinalizationError('Goal finalization model response is empty', {
        stage: 'model_response_missing',
        attempt,
        rawPreview: '',
      });
      console.error('[goal-finalize] model response missing', {
        requestId,
        trigger,
        attempt,
        stage: error.stage,
        error: error.message,
      });
      throw error;
    }

    try {
      const goalData = parseGoalFinalizeResponse(responseText);
      console.info(attempt === 2 ? '[goal-finalize] retry succeeded' : '[goal-finalize] validation succeeded', {
        requestId,
        trigger,
        attempt,
        model: finalResult.model,
        stage: 'schema_validation',
        goalTitle: goalData.goal.title,
        measurableCount: goalData.measurables.length,
        assumptionsCount: goalData.assumptions?.length ?? 0,
      });
      return goalData;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown finalization error';
      if (
        message === 'Goal finalization response is not valid JSON' ||
        message === 'Goal finalization response must be a JSON object'
      ) {
        const repaired = tryRepairFinalizationFormatting(responseText);
        if (repaired) {
          console.warn('[goal-finalize] formatting repair succeeded', {
            requestId,
            trigger,
            attempt,
            stage: 'json_parse',
            model: finalResult.model,
            repairStrategy: 'extract_embedded_json_object',
            outputShape: responseShape,
            outputPreview: previewForLog(responseText, FINALIZE_OUTPUT_DEBUG_PREVIEW),
          });
          return repaired;
        }

        lastError = new GoalFinalizationError(message, {
          stage: 'json_parse',
          attempt,
          rawPreview: responseText.slice(0, FINALIZE_OUTPUT_DEBUG_PREVIEW),
          retryable: attempt === 1,
          debug: {
            model: finalResult.model,
            outputShape: responseShape,
            outputPreview: responseText.slice(0, FINALIZE_OUTPUT_DEBUG_PREVIEW),
          },
        });
        previousOutput = responseText;
        console.error('[goal-finalize] parse failed', {
          requestId,
          trigger,
          attempt,
          stage: 'json_parse',
          model: finalResult.model,
          error: message,
          outputShape: responseShape,
          outputPreview: previewForLog(responseText, FINALIZE_OUTPUT_DEBUG_PREVIEW),
        });
        if (attempt === 1) {
          continue;
        }
        console.error('[goal-finalize] retry failed', {
          requestId,
          trigger,
          attempt,
          stage: 'json_parse',
          model: finalResult.model,
          error: message,
          outputShape: responseShape,
          outputPreview: previewForLog(responseText, FINALIZE_OUTPUT_DEBUG_PREVIEW),
        });
        throw lastError;
      }

      lastError = new GoalFinalizationError(message, {
        stage: 'schema_validation',
        attempt,
        rawPreview: responseText.slice(0, FINALIZE_OUTPUT_DEBUG_PREVIEW),
        debug: {
          model: finalResult.model,
          outputShape: responseShape,
          outputPreview: responseText.slice(0, FINALIZE_OUTPUT_DEBUG_PREVIEW),
        },
      });

      console.error('[goal-finalize] validation failed', {
        requestId,
        trigger,
        attempt,
        stage: 'schema_validation',
        model: finalResult.model,
        error: message,
        outputShape: responseShape,
        outputPreview: previewForLog(responseText, FINALIZE_OUTPUT_DEBUG_PREVIEW),
      });
      throw lastError;
    }
  }

  throw lastError ?? new Error('Goal finalization failed');
}

export async function POST(request: Request): Promise<Response> {
  const requestId = createRequestId();
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    const errBody: AiResponse<never> = { ok: false, data: null, error: { code: 'INVALID_INPUT', message: 'Invalid JSON body' } };
    return Response.json(errBody, { status: 400 });
  }

  let userMessage: string | null;
  let conversationHistory: ConversationMessage[];
  let finalizeRequested = false;
  let projectId: string | null = null;
  try {
    finalizeRequested = body.finalize === true;
    projectId = sanitizeOptionalString(body.projectId, 255);
    userMessage = finalizeRequested
      ? sanitizeOptionalString(body.userMessage, MAX_USER_MESSAGE_LENGTH)
      : sanitizeString(body.userMessage, MAX_USER_MESSAGE_LENGTH);
    conversationHistory = body.conversationHistory
      ? sanitizeHistory(body.conversationHistory)
      : [];
    if (finalizeRequested && !userMessage && conversationHistory.length === 0) {
      throw new Error('Cannot finalize without any goal conversation');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid request';
    const errBody: AiResponse<never> = { ok: false, data: null, error: { code: 'INVALID_INPUT', message } };
    return Response.json(errBody, { status: 400 });
  }

  const auth = await getAuthContextFromRequest(request);
  if (!auth) {
    const errBody: AiResponse<never> = { ok: false, data: null, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } };
    return Response.json(errBody, { status: 401 });
  }

  const history: ConversationMessage[] = [
    ...conversationHistory,
    ...(userMessage ? [{ role: 'user' as const, content: userMessage }] : []),
  ];

  console.info('[goal-create] request received', {
    requestId,
    historyTurns: history.length,
    latestUserMessageLength: userMessage?.length ?? 0,
    finalizeRequested,
    projectId,
  });

  if (finalizeRequested) {
    try {
      console.info('[goal-finalize] request received', {
        requestId,
        trigger: 'user',
        stage: 'transcript_preparation',
        historyTurns: history.length,
      });
      const transcript = prepareFinalizeTranscript({
        history,
        requestId,
        trigger: 'user',
      });
      const goalData = await finalizeGoalFromTranscript({
        requestId,
        transcript,
        trigger: 'user',
        auth,
      });

      const response: CreateResponse = {
        requestId,
        message: 'Your goal is ready to save.',
        isComplete: true,
        goalData,
        finalizedBy: 'user',
      };
      return Response.json({ ok: true, data: response, error: null } satisfies AiResponse<CreateResponse>);
    } catch (err) {
      if (isAIRateLimitError(err)) {
        return rateLimitedResponse(err);
      }

      const error = err instanceof GoalFinalizationError ? err : null;
      const message = err instanceof Error ? err.message : 'Goal finalization failed';
      console.error('[goal-create] explicit finalization failed', {
        requestId,
        trigger: 'user',
        stage: error?.stage ?? 'unknown',
        attempt: error?.attempt ?? null,
        error: message,
        rawPreview: error?.rawPreview ?? null,
      });
      const errBody: AiResponse<never> = {
        ok: false,
        data: null,
        error: {
          code: 'PARSE_ERROR',
          message: 'Goal finalization failed',
          details: {
            reason: message,
            finalizeStage: error?.stage ?? 'unknown',
            finalizeDebug: error?.debug ?? null,
            requestId,
          },
        },
      };
      return Response.json(errBody, { status: 422 });
    }
  }

  let aiMessage: string;
  try {
    const result = await callLLM({
      pipeline: 'goalCreation',
      userId: auth.userId,
      accessToken: auth.accessToken,
      systemPrompt: GOAL_CREATION_SYSTEM_PROMPT,
      messages: history,
    });
    aiMessage = result.text;
  } catch (err) {
    if (isAIRateLimitError(err)) {
      return rateLimitedResponse(err);
    }

    const message = err instanceof Error ? err.message : 'AI call failed';
    console.error('[goal-create] conversation call failed', { requestId, error: message });
    const errBody: AiResponse<never> = { ok: false, data: null, error: { code: 'AI_PROVIDER_ERROR', message, details: { requestId } } };
    return Response.json(errBody, { status: 500 });
  }

  const shouldFinalizeGoal = shouldFinalize(aiMessage);
  const displayMessage = stripFinalizeSentinel(aiMessage);

  console.info('[goal-create] conversation response received', {
    requestId,
    shouldFinalizeGoal,
    assistantPreview: displayMessage.slice(0, 160),
  });

  if (!shouldFinalizeGoal) {
    const response: CreateResponse = { requestId, message: displayMessage, isComplete: false };
    return Response.json({ ok: true, data: response, error: null } satisfies AiResponse<CreateResponse>);
  }

  let goalData: GoalFinalizeResponse;
  try {
    console.info('[goal-finalize] request received', {
      requestId,
      trigger: 'assistant',
      stage: 'transcript_preparation',
      historyTurns: history.length + 1,
    });
    const transcript = prepareFinalizeTranscript({
      history: [
        ...history,
        { role: 'assistant' as const, content: aiMessage },
      ],
      requestId,
      trigger: 'assistant',
    });
    goalData = await finalizeGoalFromTranscript({
      requestId,
      transcript,
      trigger: 'assistant',
      auth,
    });
    console.info('[goal-create] finalization succeeded', {
      requestId,
      goalTitle: goalData.goal.title,
      measurableCount: goalData.measurables.length,
      assumptionsCount: goalData.assumptions?.length ?? 0,
    });
  } catch (err) {
    if (isAIRateLimitError(err)) {
      return rateLimitedResponse(err);
    }

    const error = err instanceof GoalFinalizationError ? err : null;
    const message = err instanceof Error ? err.message : 'Goal finalization failed';
    console.error('[goal-create] finalization failed after completion signal', {
      requestId,
      trigger: 'assistant',
      stage: error?.stage ?? 'unknown',
      attempt: error?.attempt ?? null,
      error: message,
      assistantMessage: displayMessage,
      rawPreview: error?.rawPreview ?? null,
    });
    const errBody: AiResponse<never> = {
      ok: false,
      data: null,
      error: {
        code: 'PARSE_ERROR',
        message: 'Goal finalization failed after completion signal',
        details: {
          reason: message,
          finalizeStage: error?.stage ?? 'unknown',
          finalizeDebug: error?.debug ?? null,
          requestId,
        },
      },
    };
    return Response.json(errBody, { status: 422 });
  }

  const response: CreateResponse = {
    requestId,
    message: 'Your goal is ready to save.',
    isComplete: true,
    goalData,
    finalizedBy: 'assistant',
  };
  return Response.json({ ok: true, data: response, error: null } satisfies AiResponse<CreateResponse>);
}
