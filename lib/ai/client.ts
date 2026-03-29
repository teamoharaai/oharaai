interface CallLLMParams {
  pipeline: string;
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

export async function callLLM(_params: CallLLMParams): Promise<CallLLMResult> {
  throw new Error('AI client not configured — set ANTHROPIC_API_KEY');
}
