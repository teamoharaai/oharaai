export const AI_CONFIG = {
  models: {
    default: 'claude-haiku-4-5-20251001',
    goalFinalize: 'claude-haiku-4-5-20251001',
  },
  pipelines: {
    goalCreation: { enabled: true, model: 'default' },
    goalFinalize: { enabled: true, model: 'goalFinalize' },
    echoReflect: { enabled: false, model: 'default' },
    summarize: { enabled: false, model: 'default' },
  },
  maxTokens: { goalCreation: 1024, goalFinalize: 1024, echoReflect: 512, summarize: 768 },
} as const;
