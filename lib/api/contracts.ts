export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface ApiSuccessResponse<T> {
  ok: true;
  data: T;
  error: null;
}

export interface ApiErrorResponse {
  ok: false;
  data: null;
  error: {
    code: ApiErrorCode;
    message: string;
    details?: unknown;
  };
  requestId?: string;
}

export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'INVALID_INPUT'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'UNPROCESSABLE'
  | 'RATE_LIMITED'
  | 'SERVICE_UNAVAILABLE'
  | 'INTERNAL_ERROR'
  | 'UNKNOWN_ERROR';
