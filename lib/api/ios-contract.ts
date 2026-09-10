import type { ApiErrorCode, ApiErrorResponse } from './contracts.ts';

export interface IosRequestContext {
  requestId: string;
}

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;
const SAFE_CODE_PATTERN = /^[A-Za-z0-9_.:-]{1,64}$/;

export function iosRequestContext(request: Request): IosRequestContext {
  const supplied = request.headers.get('X-Request-ID')?.trim();
  return {
    requestId: supplied && REQUEST_ID_PATTERN.test(supplied)
      ? supplied
      : crypto.randomUUID(),
  };
}

export function iosJSON(
  context: IosRequestContext,
  body: unknown,
  init: ResponseInit = {},
): Response {
  const headers = new Headers(init.headers);
  headers.set('X-Request-ID', context.requestId);
  headers.set('Cache-Control', 'no-store');
  return Response.json(body, { ...init, headers });
}

export function iosError(
  context: IosRequestContext,
  status: number,
  code: ApiErrorCode,
  message: string,
  options: { retryAfterSeconds?: number } = {},
): Response {
  const body: ApiErrorResponse = {
    ok: false,
    data: null,
    error: { code, message },
    requestId: context.requestId,
  };
  const headers = new Headers();
  if (options.retryAfterSeconds !== undefined) {
    headers.set('Retry-After', String(options.retryAfterSeconds));
  }
  return iosJSON(context, body, { status, headers });
}

/** Log only operation metadata. Never pass a request body, user/record ID, or raw message. */
export function logIosRouteFailure(
  event: string,
  context: IosRequestContext,
  status: number,
  error?: unknown,
): void {
  const candidate = error && typeof error === 'object' && 'code' in error
    ? String((error as { code?: unknown }).code ?? '')
    : '';
  console.error('[ios-api]', {
    event,
    requestId: context.requestId,
    status,
    ...(SAFE_CODE_PATTERN.test(candidate) ? { providerCode: candidate } : {}),
  });
}
