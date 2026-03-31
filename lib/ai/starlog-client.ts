const STARLOG_REFLECTION_MODEL = 'claude-haiku-4-5-20251001';
const STARLOG_REFLECTION_MAX_TOKENS = 500;

interface StarlogReflectionParams {
  systemPrompt: string;
  userMessage: string;
}

interface StarlogReflectionResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
}

interface AnthropicMessageResponse {
  content?: Array<{ type?: string; text?: string }>;
  error?: { message?: string; type?: string };
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
}

function getAnthropicApiKey() {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error('Anthropic API key missing. Set ANTHROPIC_API_KEY in your local environment.');
  }

  return apiKey;
}

export async function callStarlogReflection(
  params: StarlogReflectionParams,
): Promise<StarlogReflectionResult> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'x-api-key': getAnthropicApiKey(),
    },
    body: JSON.stringify({
      model: STARLOG_REFLECTION_MODEL,
      max_tokens: STARLOG_REFLECTION_MAX_TOKENS,
      system: params.systemPrompt,
      messages: [{ role: 'user', content: params.userMessage }],
    }),
  });

  const data = (await response.json()) as AnthropicMessageResponse;

  if (!response.ok) {
    const message = data.error?.message ?? `Anthropic request failed with status ${response.status}`;
    throw new Error(message);
  }

  const text = (data.content ?? [])
    .filter((block) => block.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text)
    .join('\n')
    .trim();

  if (!text) {
    throw new Error('Anthropic returned no text content.');
  }

  return {
    text,
    inputTokens: data.usage?.input_tokens ?? 0,
    outputTokens: data.usage?.output_tokens ?? 0,
    model: STARLOG_REFLECTION_MODEL,
  };
}
