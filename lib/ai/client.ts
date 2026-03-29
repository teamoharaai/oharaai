import { AI_CONFIG } from './config';

interface CallLLMParams {
  pipeline: keyof typeof AI_CONFIG.pipelines;
  systemPrompt: string;
  userMessage: string;
  model?: string;
  maxTokens?: number;
}

interface CallLLMResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

interface AnthropicMessageResponse {
  content?: Array<{ type?: string; text?: string }>;
  error?: { message?: string; type?: string };
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
}

function resolveModel(modelKeyOrId?: string) {
  if (!modelKeyOrId) {
    return AI_CONFIG.models.default;
  }

  return AI_CONFIG.models[modelKeyOrId as keyof typeof AI_CONFIG.models] ?? modelKeyOrId;
}

function resolveMaxTokens(pipeline: keyof typeof AI_CONFIG.maxTokens, maxTokens?: number) {
  if (typeof maxTokens === 'number') {
    return maxTokens;
  }

  return AI_CONFIG.maxTokens[pipeline];
}

function getAnthropicApiKey() {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error('Anthropic API key missing. Set ANTHROPIC_API_KEY in your local environment.');
  }

  return apiKey;
}

export async function callLLM(params: CallLLMParams): Promise<CallLLMResult> {
  const pipelineConfig = AI_CONFIG.pipelines[params.pipeline];

  if (!pipelineConfig.enabled) {
    throw new Error(`AI pipeline "${params.pipeline}" is disabled in lib/ai/config.ts`);
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'x-api-key': getAnthropicApiKey(),
    },
    body: JSON.stringify({
      model: resolveModel(params.model ?? pipelineConfig.model),
      max_tokens: resolveMaxTokens(params.pipeline, params.maxTokens),
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
  };
}
