interface AIJob {
  id: string;
  pipeline: string;
  payload: unknown;
}

export async function enqueueAIJob(_pipeline: string, _payload: unknown): Promise<string> {
  // TODO: implement job queue
  return '';
}

export async function processAIJob(_job: AIJob): Promise<void> {
  // TODO: implement job processing
}
