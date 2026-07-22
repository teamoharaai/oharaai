// POST /api/goals/chat — AI goal-formation conversation.
//
// Stateless: the client sends the full conversation history on every call.
// There is no session id and no server-side conversation state.
//
// Flow (see lib/ai/prompts/goal-creation.ts):
//   1. Run the conversation turn (goalChat pipeline).
//   2. If the assistant response does NOT contain [[GOAL_READY]], return it as
//      a plain message and the conversation continues.
//   3. If it DOES, strip the sentinel and run the finalization turn
//      (goalFinalize pipeline) to produce 3 structured goal templates, retrying
//      once on a parse failure.
//
// This route never persists a goal — persistence happens later via POST
// /api/goals once the user picks a template.

import { withAuth, type AuthContext } from '@/lib/api/auth';
import { callLLM } from '@/lib/ai/client';
import { isAIRateLimitError } from '@/lib/ai/errors';
import {
  GOAL_CREATION_SYSTEM_PROMPT,
  GOAL_CREATION_FINALIZE_PROMPT,
  GOAL_CREATION_FINALIZE_RETRY_PROMPT,
} from '@/lib/ai/prompts/goal-creation';
import {
  parseGoalTemplateResponse,
  type GoalTemplateResponse,
} from '@/lib/ai/schemas/goal-creation';

const GOAL_READY_SENTINEL = '[[GOAL_READY]]';
const MAX_MESSAGES = 20; // 10 turns max — safety cap against abuse.
const FINALIZE_SYSTEM_PROMPT =
  'You are a goal structuring assistant. Produce the requested JSON.';
const FINALIZE_PREFILL = '{"templates":';

type ChatMessage = { role: 'user' | 'assistant'; content: string };

type GoalChatResponseBody =
  | { type: 'message'; content: string }
  | { type: 'templates'; transition_message: string; templates: GoalTemplateResponse }
  | { type: 'error'; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateMessages(payload: unknown): ChatMessage[] {
  if (!isRecord(payload)) {
    throw new Error('Request body must be a JSON object');
  }
  const { messages } = payload;
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('messages must be a non-empty array');
  }
  if (messages.length > MAX_MESSAGES) {
    throw new Error(`messages must contain at most ${MAX_MESSAGES} items`);
  }

  const validated: ChatMessage[] = messages.map((message, index) => {
    if (!isRecord(message)) {
      throw new Error(`messages[${index}] must be an object`);
    }
    if (message.role !== 'user' && message.role !== 'assistant') {
      throw new Error(`messages[${index}].role must be 'user' or 'assistant'`);
    }
    if (typeof message.content !== 'string' || message.content.trim() === '') {
      throw new Error(`messages[${index}].content must be a non-empty string`);
    }
    return { role: message.role, content: message.content };
  });

  if (validated[validated.length - 1].role !== 'user') {
    throw new Error('The last message must have role: user');
  }

  return validated;
}

function jsonResponse(body: GoalChatResponseBody, status = 200): Response {
  return Response.json(body, { status });
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
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  let messages: ChatMessage[];
  try {
    messages = validateMessages(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid request body';
    return Response.json({ error: message }, { status: 400 });
  }

  try {
    // 1. Conversation turn.
    const conversation = await callLLM({
      pipeline: 'goalChat',
      userId: auth.userId,
      accessToken: auth.accessToken,
      systemPrompt: GOAL_CREATION_SYSTEM_PROMPT,
      messages,
    });

    if (!conversation.text.includes(GOAL_READY_SENTINEL)) {
      return jsonResponse({ type: 'message', content: conversation.text.trim() });
    }

    // 2. [[GOAL_READY]] detected — strip the sentinel and keep the clean
    //    transition message the user sees.
    const transitionMessage = conversation.text.split(GOAL_READY_SENTINEL).join('').trim();

    // 3. Finalization turn: full history + clean assistant turn + finalize ask.
    const finalizeConversation: ChatMessage[] = [
      ...messages,
      { role: 'assistant', content: transitionMessage },
      { role: 'user', content: GOAL_CREATION_FINALIZE_PROMPT },
    ];

    const finalize = await callLLM({
      pipeline: 'goalFinalize',
      userId: auth.userId,
      accessToken: auth.accessToken,
      systemPrompt: FINALIZE_SYSTEM_PROMPT,
      messages: finalizeConversation,
      assistantPrefill: FINALIZE_PREFILL,
    });

    let parsed = parseGoalTemplateResponse(finalize.text);

    // 4. On parse failure, retry once with the failed output + retry prompt.
    if (!parsed.success) {
      const retry = await callLLM({
        pipeline: 'goalFinalize',
        userId: auth.userId,
        accessToken: auth.accessToken,
        systemPrompt: FINALIZE_SYSTEM_PROMPT,
        messages: [
          ...finalizeConversation,
          { role: 'assistant', content: finalize.text },
          { role: 'user', content: GOAL_CREATION_FINALIZE_RETRY_PROMPT },
        ],
        assistantPrefill: FINALIZE_PREFILL,
      });
      parsed = parseGoalTemplateResponse(retry.text);
    }

    if (!parsed.success) {
      // The conversation was valid; the model output wasn't. Surface a soft
      // error (200) rather than a 500 so the client can offer a retry.
      return jsonResponse({
        type: 'error',
        error: 'Failed to generate goal templates. Please try again.',
      });
    }

    return jsonResponse({
      type: 'templates',
      transition_message: transitionMessage,
      templates: parsed.data,
    });
  } catch (error) {
    if (isAIRateLimitError(error)) {
      return jsonResponse(
        {
          type: 'error',
          error: 'Daily AI limit reached. Try again tomorrow or create your goal manually.',
        },
        429,
      );
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[goals/chat] AI call failed:', message);
    return jsonResponse(
      { type: 'error', error: 'AI service temporarily unavailable. Please try again.' },
      500,
    );
  }
}

export async function POST(request: Request): Promise<Response> {
  return withAuth(handlePost)(request);
}
