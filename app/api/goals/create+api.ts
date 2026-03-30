import { callLLM } from '@/lib/ai/client';
import {
  GOAL_CREATION_SYSTEM_PROMPT,
  GOAL_CREATION_FINALIZE_PROMPT,
} from '@/lib/ai/prompts/goal-creation';

type ConversationMessage = { role: 'user' | 'assistant'; content: string };

// userId must NEVER come from the request body — it must come from the session.
// It is intentionally excluded from this interface.
interface RequestBody {
  userMessage: string;
  conversationHistory?: ConversationMessage[];
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
}

interface CreateResponse {
  message: string;
  isComplete: boolean;
  goalData?: GoalData;
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

const FINALIZE_SIGNAL = /i think i have what i need/i;

export async function POST(request: Request): Promise<Response> {
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  let userMessage: string;
  let conversationHistory: ConversationMessage[];
  try {
    userMessage = sanitizeString(body.userMessage, MAX_USER_MESSAGE_LENGTH);
    conversationHistory = body.conversationHistory
      ? sanitizeHistory(body.conversationHistory)
      : [];
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid request';
    return Response.json({ error: message }, { status: 400 });
  }

  const history: ConversationMessage[] = [
    ...conversationHistory,
    { role: 'user', content: userMessage },
  ];

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
    return Response.json({ error: message }, { status: 500 });
  }

  if (!FINALIZE_SIGNAL.test(aiMessage)) {
    const response: CreateResponse = { message: aiMessage, isComplete: false };
    return Response.json(response);
  }

  // Finalization: build conversation transcript and call finalize prompt
  const transcript = [
    ...history,
    { role: 'assistant' as const, content: aiMessage },
  ]
    .map((m) => `${m.role === 'user' ? 'User' : 'Guide'}: ${m.content}`)
    .join('\n\n');

  let goalData: GoalData;
  try {
    const finalResult = await callLLM({
      pipeline: 'goalCreation',
      systemPrompt: GOAL_CREATION_FINALIZE_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Here is the conversation:\n\n${transcript}\n\nProduce the goal JSON now.`,
        },
      ],
    });

    goalData = JSON.parse(finalResult.text) as GoalData;
  } catch (err) {
    // Finalization failed — return the conversational message without goalData
    console.error('Goal finalization failed:', err);
    const response: CreateResponse = { message: aiMessage, isComplete: false };
    return Response.json(response);
  }

  const response: CreateResponse = { message: aiMessage, isComplete: true, goalData };
  return Response.json(response);
}
