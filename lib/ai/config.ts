export const AI_CONFIG = {
  models: {
    default: 'claude-haiku-4-5-20251001',
    sonnet: 'claude-sonnet-4-6',
  },
  pipelines: {
    goalCreation: { enabled: true, model: 'sonnet' },
    starlogReflect: { enabled: false, model: 'default' },
    summarize: { enabled: false, model: 'default' },
  },
  maxTokens: { goalCreation: 1024, starlogReflect: 512, summarize: 768 },
} as const;
