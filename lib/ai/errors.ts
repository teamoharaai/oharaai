import type { AiErrorCode } from './contracts';

// Re-export so callers can import AiErrorCode from this file if preferred.
export type { AiErrorCode } from './contracts';

// Canonical error code constants. Values must match AiErrorCode in lib/ai/contracts.ts.
export const AI_ERROR_CODES = {
  rateLimited: 'RATE_LIMITED',
  unauthorized: 'UNAUTHORIZED',
  invalidInput: 'INVALID_INPUT',
  aiProviderError: 'AI_PROVIDER_ERROR',
  parseError: 'PARSE_ERROR',
  unknownError: 'UNKNOWN_ERROR',
  featureDisabled: 'FEATURE_DISABLED',
} as const satisfies Record<string, AiErrorCode>;

export class AIRateLimitError extends Error {
  code: AiErrorCode = AI_ERROR_CODES.rateLimited;

  constructor(message = 'Daily AI limit reached') {
    super(message);
    this.name = 'AIRateLimitError';
  }
}

export function isAIRateLimitError(error: unknown): error is AIRateLimitError {
  return error instanceof AIRateLimitError;
}
