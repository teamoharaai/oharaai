import { callLLM } from '../client';
import { GOAL_CREATION_SYSTEM_PROMPT } from '../prompts/goal-creation';

export async function runGoalCreationPipeline(
  userMessage: string,
  auth: { userId: string; accessToken: string },
) {
  return callLLM({
    pipeline: 'goalCreation',
    userId: auth.userId,
    accessToken: auth.accessToken,
    systemPrompt: GOAL_CREATION_SYSTEM_PROMPT,
    userMessage,
  });
}
