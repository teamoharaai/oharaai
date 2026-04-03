import { callEchoReflection } from '@/lib/ai/echo-client';
import { buildEchoReflectionPrompt } from '@/lib/ai/prompts/echo-reflection';
import { ECHO_INFERENCE_PROMPT } from '@/lib/ai/echo/prompts';
import type { EchoEmotion, EchoBrt } from '@/features/echo/types';

interface ReflectRequestBody {
  content?: string;
  aiInsightRequested?: boolean;
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
  try {
    const body = (await request.json()) as ReflectRequestBody;

    if (body.aiInsightRequested === false) {
      return Response.json({ reflection: null });
    }

    const content = sanitizeContent(body.content);
    const result = await callEchoReflection({
      systemPrompt: ECHO_INFERENCE_PROMPT,
      userMessage: buildEchoReflectionPrompt(content),
    });

    const { reflection, emotion, brt, confidence } = parseInferenceResponse(result.text);

    return Response.json({ reflection, emotion, brt, confidence });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';

    return Response.json(
      {
        error: 'Failed to generate Echo reflection',
        details: message,
      },
      { status: 400 },
    );
  }
}
