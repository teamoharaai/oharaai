import { AI_CONFIG } from './config';

type ConversationMessage = { role: 'user' | 'assistant'; content: string };

interface CallLLMParams {
  pipeline: keyof typeof AI_CONFIG.pipelines;
  systemPrompt: string;
  /** Single-turn: provide userMessage. Multi-turn: provide messages array. */
  userMessage?: string;
  messages?: ConversationMessage[];
  assistantPrefill?: string;
  model?: string;
  maxTokens?: number;
  stopSequences?: string[];
}

interface CallLLMResult {
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

  const resolvedModel = resolveModel(params.model ?? pipelineConfig.model);
  const requestMessages = params.messages ?? [{ role: 'user' as const, content: params.userMessage ?? '' }];
  const messages = params.assistantPrefill
    ? [...requestMessages, { role: 'assistant' as const, content: params.assistantPrefill }]
    : requestMessages;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'x-api-key': getAnthropicApiKey(),
    },
    body: JSON.stringify({
      model: resolvedModel,
      max_tokens: resolveMaxTokens(params.pipeline, params.maxTokens),
      system: params.systemPrompt,
      messages,
      stop_sequences: params.stopSequences,
    }),
  });

  const data = (await response.json()) as AnthropicMessageResponse;

  if (!response.ok) {
    const message = data.error?.message ?? `Anthropic request failed with status ${response.status}`;
    throw new Error(message);
  }

  const continuation = (data.content ?? [])
    .filter((block) => block.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text)
    .join('\n')
    .trim();

  if (!continuation) {
    throw new Error('Anthropic returned no text content.');
  }

  const text = params.assistantPrefill
    ? `${params.assistantPrefill}${continuation}`
    : continuation;

  return {
    text,
    inputTokens: data.usage?.input_tokens ?? 0,
    outputTokens: data.usage?.output_tokens ?? 0,
    model: resolvedModel,
  };
}
