import type { ApiErrorCode, ApiResponse } from './contracts';
import { CircleDataError } from '@/lib/db/circles-core';

function errorResponse(
  status: number,
  code: ApiErrorCode,
  message: string,
): Response {
  const body: ApiResponse<never> = {
    ok: false,
    data: null,
    error: { code, message },
  };
  return Response.json(body, { status });
}

export function circlesUnauthorizedResponse(): Response {
  return errorResponse(401, 'UNAUTHORIZED', 'Unauthorized');
}

export function circlesSuccessResponse<T>(data: T, status = 200): Response {
  const body: ApiResponse<T> = { ok: true, data, error: null };
  return Response.json(body, { status });
}

// Maps the typed CircleDataError (from lib/db/circles.ts) to HTTP, mirroring the
// friends layer. Postgres SQLSTATEs were already folded into these domain codes:
//   42501→FORBIDDEN(403), P0002→NOT_FOUND(404), 22023→INVALID_INPUT(400),
//   23505→CONFLICT(409). Anything else is an unexpected 500 with a generic body.
export function circlesErrorResponse(
  error: unknown,
  internalMessage: string,
): Response {
  if (error instanceof CircleDataError) {
    switch (error.code) {
      case 'INVALID_INPUT':
        return errorResponse(400, 'INVALID_INPUT', error.message);
      case 'NOT_FOUND':
        return errorResponse(404, 'NOT_FOUND', error.message);
      case 'FORBIDDEN':
        return errorResponse(403, 'UNAUTHORIZED', error.message);
      case 'CONFLICT':
        return errorResponse(409, 'CONFLICT', error.message);
    }
  }

  console.error(`[circles] ${internalMessage}`, error);
  return errorResponse(500, 'INTERNAL_ERROR', internalMessage);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function readCircleRequestBody(
  request: Request,
): Promise<Record<string, unknown>> {
  let value: unknown;
  try {
    value = await request.json();
  } catch {
    throw new CircleDataError('INVALID_INPUT', 'Invalid JSON body.');
  }
  if (!isRecord(value)) {
    throw new CircleDataError(
      'INVALID_INPUT',
      'Request body must be a JSON object.',
    );
  }
  return value;
}
