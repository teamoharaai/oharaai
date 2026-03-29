import { callLLM } from '../client';
import { SUMMARIZER_SYSTEM_PROMPT } from '../prompts/summarizer';

export async function runSummarizePipeline(userMessage: string) {
  return callLLM({
    pipeline: 'summarize',
    systemPrompt: SUMMARIZER_SYSTEM_PROMPT,
    userMessage,
  });
}
