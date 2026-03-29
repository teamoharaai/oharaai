import { callLLM } from '../client';
import { GOAL_CREATION_SYSTEM_PROMPT } from '../prompts/goal-creation';

export async function runGoalCreationPipeline(userMessage: string) {
  return callLLM({
    pipeline: 'goalCreation',
    systemPrompt: GOAL_CREATION_SYSTEM_PROMPT,
    userMessage,
  });
}
