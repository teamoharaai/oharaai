export const AI_CONFIG = {
  models: {
    default: 'claude-haiku-4-5-20251001',
    goalFinalize: 'claude-haiku-4-5-20251001',
  },
  pipelines: {
    goalCreation: { enabled: true, model: 'default' },
    // goalChat is the new alias for the goal-creation conversation turns.
    // goalCreation is kept for backward compatibility with anything referencing it by name.
    goalChat: { enabled: true, model: 'default' },
    goalFinalize: { enabled: true, model: 'goalFinalize' },
    goalSuggestion: { enabled: true, model: 'default' },
    echoReflect: { enabled: true, model: 'default' },
    summarize: { enabled: false, model: 'default' },
    // Intelligence insight — enabled here; gated at the feature level by
    // FEATURES.INTELLIGENCE_ENABLED in constants/features.ts. The API route
    // returns 503 when the feature flag is off, so this flag controls the
    // raw LLM call; the feature flag controls product surface visibility.
    intelligence: { enabled: true, model: 'default' },
  },
  maxTokens: {
    goalCreation: 1024,
    goalChat: 1024,
    goalFinalize: 2500,
    goalSuggestion: 150,
    echoReflect: 512,
    summarize: 768,
    intelligence: 200,
  },
} as const;
