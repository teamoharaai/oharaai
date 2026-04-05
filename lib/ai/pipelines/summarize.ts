import { callLLM } from '../client';
import { SUMMARIZER_SYSTEM_PROMPT } from '../prompts/summarizer';

export async function runSummarizePipeline(
  userMessage: string,
  auth: { userId: string; accessToken: string },
) {
  return callLLM({
    pipeline: 'summarize',
    userId: auth.userId,
    accessToken: auth.accessToken,
    systemPrompt: SUMMARIZER_SYSTEM_PROMPT,
    userMessage,
  });
}
