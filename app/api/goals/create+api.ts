import { callLLM } from '@/lib/ai/client';
import {
  GOAL_CREATION_SYSTEM_PROMPT,
  GOAL_CREATION_FINALIZE_PROMPT,
  GOAL_CREATION_FINALIZE_RETRY_PROMPT,
} from '@/lib/ai/prompts/goal-creation';
import {
  parseGoalFinalizeResponse,
  type GoalFinalizeResponse,
} from '@/lib/ai/schemas/goal-creation';

type ConversationMessage = { role: 'user' | 'assistant'; content: string };

// userId must NEVER come from the request body — it must come from the session.
// It is intentionally excluded from this interface.
interface RequestBody {
  userMessage?: string;
  conversationHistory?: ConversationMessage[];
  finalize?: boolean;
}

interface SmartData {
  specific: string;
  measurable: string;
  achievable: string;
  relevant: string;
  timeBound: string;
}

interface AiMeasurable {
  title: string;
  type: 'counter' | 'habit' | 'checklist';
  targetValue: number | null;
  targetUnit: string | null;
  frequency: 'daily' | 'weekly' | 'monthly' | 'once';
}

export interface GoalData {
  goal: {
    title: string;
    description: string;
    category: string;
    deadline: string | null;
    smart: SmartData;
  };
  measurables: AiMeasurable[];
  reasoning: string;
  assumptions?: string[];
}

interface CreateResponse {
  requestId: string;
  message: string;
  isComplete: boolean;
  goalData?: GoalData;
  finalizedBy?: 'assistant' | 'user';
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

// ─── Goal payload validation (used when writing to DB) ───────────────────────

const VALID_CATEGORIES = ['body', 'mind', 'money', 'create', 'connect', 'contribute'] as const;
const VALID_MODES = ['exploration', 'commitment'] as const;

function validateFutureDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) throw new Error('Invalid date');
  if (date < new Date()) throw new Error('Deadline must be in the future');
  return date.toISOString();
}

export function validateGoalPayload(body: unknown) {
  if (!body || typeof body !== 'object') throw new Error('Invalid payload');
  const b = body as Record<string, unknown>;

  const category = b.category;
  if (!VALID_CATEGORIES.includes(category as (typeof VALID_CATEGORIES)[number])) {
    throw new Error('Invalid category');
  }

  const mode = b.mode;
  if (!VALID_MODES.includes(mode as (typeof VALID_MODES)[number])) {
    throw new Error('Invalid mode');
  }

  return {
    title: sanitizeString(b.title, 200),
    description: b.description ? sanitizeString(b.description as string, 2000) : null,
    category: category as string,
    mode: mode as string,
    deadline: b.deadline ? validateFutureDate(b.deadline as string) : null,
  };
}

// ─── Route handler ────────────────────────────────────────────────────────────

const FINALIZE_SENTINEL = '[[GOAL_READY]]';
const INTERNAL_MARKER_PATTERN = /\[\[[A-Z0-9_:-]+\]\]/g;

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

  constructor(
    message: string,
    options: {
      stage: GoalFinalizeStage;
      attempt: number;
      rawPreview: string;
      retryable?: boolean;
    },
  ) {
    super(message);
    this.name = 'GoalFinalizationError';
    this.stage = options.stage;
    this.attempt = options.attempt;
    this.rawPreview = options.rawPreview;
    this.retryable = options.retryable ?? false;
  }
}

function previewForLog(value: string | null | undefined, maxLength = 240) {
  if (!value) return null;
  return value.slice(0, maxLength);
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
    const sanitizedTurns = history
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

async function finalizeGoalFromTranscript({
  requestId,
  transcript,
  trigger,
}: {
  requestId: string;
  transcript: string;
  trigger: FinalizeTrigger;
}): Promise<GoalFinalizeResponse> {
  let lastError: GoalFinalizationError | null = null;
  let previousOutput: string | null = null;

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
    try {
      finalResult = await callLLM({
        pipeline: 'goalCreation',
        systemPrompt,
        messages: [{ role: 'user', content: userContent }],
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Finalization model call failed';
      const stage: GoalFinalizeStage = message.includes('no text content')
        ? 'model_response_missing'
        : 'model_call';
      console.error(stage === 'model_call' ? '[goal-finalize] model call failed' : '[goal-finalize] model response missing', {
        requestId,
        trigger,
        attempt,
        stage,
        error: message,
      });
      throw new GoalFinalizationError(message, {
        stage,
        attempt,
        rawPreview: '',
      });
    }

    const responseText = finalResult.text.trim();
    console.info('[goal-finalize] model response received', {
      requestId,
      trigger,
      attempt,
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
        lastError = new GoalFinalizationError(message, {
          stage: 'json_parse',
          attempt,
          rawPreview: responseText.slice(0, 500),
          retryable: attempt === 1,
        });
        previousOutput = responseText;
        console.error('[goal-finalize] parse failed', {
          requestId,
          trigger,
          attempt,
          stage: 'json_parse',
          error: message,
          outputPreview: previewForLog(responseText),
        });
        if (attempt === 1) {
          continue;
        }
        console.error('[goal-finalize] retry failed', {
          requestId,
          trigger,
          attempt,
          stage: 'json_parse',
          error: message,
          outputPreview: previewForLog(responseText),
        });
        throw lastError;
      }

      lastError = new GoalFinalizationError(message, {
        stage: 'schema_validation',
        attempt,
        rawPreview: responseText.slice(0, 500),
      });

      console.error('[goal-finalize] validation failed', {
        requestId,
        trigger,
        attempt,
        stage: 'schema_validation',
        error: message,
        outputPreview: previewForLog(responseText),
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
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  let userMessage: string | null;
  let conversationHistory: ConversationMessage[];
  let finalizeRequested = false;
  try {
    finalizeRequested = body.finalize === true;
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
    return Response.json({ error: message }, { status: 400 });
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
      });

      const response: CreateResponse = {
        requestId,
        message: 'Your goal is ready to save.',
        isComplete: true,
        goalData,
        finalizedBy: 'user',
      };
      return Response.json(response);
    } catch (err) {
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
      return Response.json(
        {
          error: 'Goal finalization failed',
          code: 'GOAL_FINALIZATION_FAILED',
          details: message,
          finalizeStage: error?.stage ?? 'unknown',
          requestId,
        },
        { status: 422 },
      );
    }
  }

  let aiMessage: string;
  try {
    const result = await callLLM({
      pipeline: 'goalCreation',
      systemPrompt: GOAL_CREATION_SYSTEM_PROMPT,
      messages: history,
    });
    aiMessage = result.text;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI call failed';
    console.error('[goal-create] conversation call failed', { requestId, error: message });
    return Response.json({ error: message, requestId }, { status: 500 });
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
    return Response.json(response);
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
    });
    console.info('[goal-create] finalization succeeded', {
      requestId,
      goalTitle: goalData.goal.title,
      measurableCount: goalData.measurables.length,
      assumptionsCount: goalData.assumptions?.length ?? 0,
    });
  } catch (err) {
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
    return Response.json(
      {
        error: 'Goal finalization failed after completion signal',
        code: 'GOAL_FINALIZATION_FAILED',
        details: message,
        finalizeStage: error?.stage ?? 'unknown',
        requestId,
      },
      { status: 422 },
    );
  }

  const response: CreateResponse = {
    requestId,
    message: 'Your goal is ready to save.',
    isComplete: true,
    goalData,
    finalizedBy: 'assistant',
  };
  return Response.json(response);
}
