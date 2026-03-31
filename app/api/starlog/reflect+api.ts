import { callStarlogReflection } from '@/lib/ai/starlog-client';
import {
  STARLOG_REFLECTION_SYSTEM_PROMPT,
  buildStarlogReflectionPrompt,
} from '@/lib/ai/prompts/starlog-reflection';

interface ReflectRequestBody {
  content?: string;
  aiInsightRequested?: boolean;
}

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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ReflectRequestBody;

    if (body.aiInsightRequested === false) {
      return Response.json({ reflection: null });
    }

    const content = sanitizeContent(body.content);
    const result = await callStarlogReflection({
      systemPrompt: STARLOG_REFLECTION_SYSTEM_PROMPT,
      userMessage: buildStarlogReflectionPrompt(content),
    });

    return Response.json({
      reflection: result.text,
      model: result.model,
      usage: {
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';

    return Response.json(
      {
        error: 'Failed to generate Starlog reflection',
        details: message,
      },
      { status: 400 },
    );
  }
}
