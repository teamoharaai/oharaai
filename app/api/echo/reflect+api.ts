import { callEchoReflection } from '@/lib/ai/echo-client';
import { buildEchoReflectionPrompt } from '@/lib/ai/prompts/echo-reflection';
import { ECHO_INFERENCE_PROMPT } from '@/lib/ai/echo/prompts';
import supabase, { isDatabaseConfigured } from '@/lib/db/client';
import type { EchoEmotion, EchoBrt } from '@/features/echo/types';

interface ReflectRequestBody {
  content?: string;
  aiInsightRequested?: boolean;
}

async function getUserFromRequest(request: Request) {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token || !isDatabaseConfigured) return null;

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  return error || !user ? null : user;
}

async function touchLastSummarizedAt(userId: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ last_summarized_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) {
    console.error('[echo/reflect] failed to update last_summarized_at:', error.message);
  }
}

type InferenceResult = {
  reflection: string;
  emotion: EchoEmotion | null;
  brt: EchoBrt | null;
  confidence: number | null;
};

function sanitizeContent(input: unknown) {
  if (typeof input !== 'string') {
    throw new Error('content must be a string');
  }

  const cleaned = input
    .replace(/\0/g, '')
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim();

  if (!cleaned) {
    throw new Error('content cannot be empty');
  }

  if (cleaned.length > 8000) {
    throw new Error('content exceeds 8000 character limit');
  }

  return cleaned;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function parseInferenceResponse(rawText: string): InferenceResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawText);
  } catch (err) {
    console.error('[echo/reflect] JSON.parse failed:', err);
    return { reflection: rawText, emotion: null, brt: null, confidence: null };
  }

  if (typeof parsed !== 'object' || parsed === null) {
    console.error('[echo/reflect] parsed value is not an object');
    return { reflection: rawText, emotion: null, brt: null, confidence: null };
  }

  const obj = parsed as Record<string, unknown>;

  if (typeof obj['reflection'] !== 'string') {
    console.error('[echo/reflect] reflection field missing or not a string');
    return { reflection: rawText, emotion: null, brt: null, confidence: null };
  }

  const reflection = obj['reflection'];

  let emotion: EchoEmotion | null = null;
  const rawEmotion = obj['emotion'];
  if (
    rawEmotion !== null &&
    typeof rawEmotion === 'object' &&
    !Array.isArray(rawEmotion)
  ) {
    const e = rawEmotion as Record<string, unknown>;
    if (
      typeof e['primary'] === 'string' &&
      typeof e['valence'] === 'number' &&
      (e['energy'] === 'low' || e['energy'] === 'medium' || e['energy'] === 'high') &&
      (e['clarity'] === 'low' || e['clarity'] === 'high')
    ) {
      emotion = {
        primary: e['primary'],
        valence: e['valence'],
        energy: e['energy'],
        clarity: e['clarity'],
      };
    } else {
      console.error('[echo/reflect] emotion fields failed validation, discarding');
    }
  }

  let brt: EchoBrt | null = null;
  const rawBrt = obj['brt'];
  if (
    rawBrt !== null &&
    typeof rawBrt === 'object' &&
    !Array.isArray(rawBrt)
  ) {
    const b = rawBrt as Record<string, unknown>;
    if (
      isStringArray(b['bud']) &&
      isStringArray(b['rose']) &&
      isStringArray(b['thorn'])
    ) {
      brt = { bud: b['bud'], rose: b['rose'], thorn: b['thorn'] };
    } else {
      console.error('[echo/reflect] brt fields failed validation, discarding');
    }
  }

  const confidence =
    typeof obj['confidence'] === 'number' ? obj['confidence'] : null;

  return { reflection, emotion, brt, confidence };
}

export async function POST(request: Request) {
  let body: ReflectRequestBody;
  try {
    body = (await request.json()) as ReflectRequestBody;
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (body.aiInsightRequested === false) {
    return Response.json({ reflection: null, summarized: false });
  }

  let content: string;
  try {
    content = sanitizeContent(body.content);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid content';
    return Response.json({ error: message }, { status: 400 });
  }

  let result;
  try {
    result = await callEchoReflection({
      systemPrompt: ECHO_INFERENCE_PROMPT,
      userMessage: buildEchoReflectionPrompt(content),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[echo/reflect] AI call failed, entry already saved:', message);
    return Response.json({ reflection: null, emotion: null, brt: null, confidence: null, summarized: false });
  }

  const { reflection, emotion, brt, confidence } = parseInferenceResponse(result.text);

  // Fire-and-forget: update last_summarized_at on the profile.
  // Deliberately not awaited — a profile update failure must never block the response.
  const user = await getUserFromRequest(request);
  if (user) {
    void touchLastSummarizedAt(user.id);
  }

  return Response.json({ reflection, emotion, brt, confidence, summarized: true });
}
