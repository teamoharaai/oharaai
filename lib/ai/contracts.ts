/**
 * Shared AI response envelope.
 * All AI-backed API endpoints return AiResponse<T>.
 *
 * Success: { ok: true,  data: T,    error: null }
 * Failure: { ok: false, data: null, error: { code, message, details? } }
 */

export type AiErrorCode =
  | 'RATE_LIMITED'
  | 'UNAUTHORIZED'
  | 'INVALID_INPUT'
  | 'AI_PROVIDER_ERROR'
  | 'PARSE_ERROR'
  | 'UNKNOWN_ERROR'
  | 'FEATURE_DISABLED';

export interface AiSuccessResponse<T> {
  ok: true;
  data: T;
  error: null;
}

export interface AiErrorResponse {
  ok: false;
  data: null;
  error: {
    code: AiErrorCode;
    message: string;
    details?: unknown;
  };
}

export type AiResponse<T> = AiSuccessResponse<T> | AiErrorResponse;
