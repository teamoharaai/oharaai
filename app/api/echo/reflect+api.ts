import { callEchoReflection } from '@/lib/ai/echo-client';
import {
  isAIRateLimitError,
} from '@/lib/ai/errors';
import type { AiResponse } from '@/lib/ai/contracts';
import { buildEchoReflectionPrompt } from '@/lib/ai/prompts/echo-reflection';
import { ECHO_INFERENCE_PROMPT } from '@/lib/ai/echo/prompts';
import supabase, { isDatabaseConfigured, createAuthedClient } from '@/lib/db/client';
import type { EchoEmotion, EchoBrt } from '@/features/echo/types';

interface ReflectRequestBody {
  content?: string;
  aiInsightRequested?: boolean;
  echo_entry_id?: string;
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
  reflection: string | null;
  emotion: EchoEmotion | null;
  brt: EchoBrt | null;
  confidence: number | null;
  summarized: boolean;
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
    return { reflection: rawText, emotion: null, brt: null, confidence: null, summarized: false };
  }

  if (typeof parsed !== 'object' || parsed === null) {
    console.error('[echo/reflect] parsed value is not an object');
    return { reflection: rawText, emotion: null, brt: null, confidence: null, summarized: false };
  }

  const obj = parsed as Record<string, unknown>;

  if (typeof obj['reflection'] !== 'string') {
    console.error('[echo/reflect] reflection field missing or not a string');
    return { reflection: rawText, emotion: null, brt: null, confidence: null, summarized: false };
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

  return { reflection, emotion, brt, confidence, summarized: true };
}

export async function POST(request: Request) {
  let body: ReflectRequestBody;
  try {
    body = (await request.json()) as ReflectRequestBody;
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (body.aiInsightRequested === false) {
    const noAiBody: AiResponse<Pick<InferenceResult, 'reflection' | 'summarized'>> = {
      ok: true,
      data: { reflection: null, summarized: false },
      error: null,
    };
    return Response.json(noAiBody);
  }

  const auth = await getAuthContextFromRequest(request);
  if (!auth) {
    const errBody: AiResponse<never> = { ok: false, data: null, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } };
    return Response.json(errBody, { status: 401 });
  }

  const authedDb = createAuthedClient(auth.accessToken);
  const { data: profile } = await authedDb
    .from('profiles')
    .select('intelligence_enabled')
    .eq('id', auth.userId)
    .single();

  if (profile?.intelligence_enabled === false) {
    if (body.echo_entry_id) {
      await authedDb
        .from('echo_entries')
        .update({ ai_status: 'not_requested' })
        .eq('id', body.echo_entry_id);
    }
    const disabledBody: AiResponse<Pick<InferenceResult, 'reflection' | 'summarized'> & { disabled: true }> = {
      ok: true,
      data: { reflection: null, summarized: false, disabled: true },
      error: null,
    };
    return Response.json(disabledBody);
  }

  let content: string;
  try {
    content = sanitizeContent(body.content);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid content';
    const errBody: AiResponse<never> = { ok: false, data: null, error: { code: 'INVALID_INPUT', message } };
    return Response.json(errBody, { status: 400 });
  }

  let result;
  try {
    result = await callEchoReflection({
      userId: auth.userId,
      accessToken: auth.accessToken,
      systemPrompt: ECHO_INFERENCE_PROMPT,
      userMessage: buildEchoReflectionPrompt(content),
    });
  } catch (error) {
    if (isAIRateLimitError(error)) {
      const errBody: AiResponse<never> = { ok: false, data: null, error: { code: 'RATE_LIMITED', message: error.message } };
      return Response.json(errBody, { status: 429 });
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[echo/reflect] AI call failed, entry already saved:', message);
    // Return ok:true with null reflection — the entry is already saved locally.
    // The caller checks summarized:false and resolves to saved_without_summary.
    const fallbackBody: AiResponse<InferenceResult> = {
      ok: true,
      data: { reflection: null, emotion: null, brt: null, confidence: null, summarized: false },
      error: null,
    };
    return Response.json(fallbackBody);
  }

  const { reflection, emotion, brt, confidence, summarized } = parseInferenceResponse(result.text);

  // Fire-and-forget: update last_summarized_at on the profile.
  // Deliberately not awaited — a profile update failure must never block the response.
  if (summarized) {
    void touchLastSummarizedAt(auth.userId);
  }

  const successBody: AiResponse<InferenceResult> = {
    ok: true,
    data: { reflection, emotion, brt, confidence, summarized },
    error: null,
  };
  return Response.json(successBody);
}
