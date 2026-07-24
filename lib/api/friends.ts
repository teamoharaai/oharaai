import type { ApiErrorCode, ApiResponse } from './contracts';
import type { FriendErrorDetails } from '@/features/friends/types';
import {
  FriendDataError,
  validateAddresseeId,
  validateUsernamePrefix,
  validateUuid,
} from '@/lib/db/friends-core';

function errorResponse(
  status: number,
  code: ApiErrorCode,
  message: string,
  details?: FriendErrorDetails,
): Response {
  const body: ApiResponse<never> = {
    ok: false,
    data: null,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  };
  return Response.json(body, { status });
}

export function friendsUnauthorizedResponse(): Response {
  return errorResponse(401, 'UNAUTHORIZED', 'Unauthorized');
}

export function friendsSuccessResponse<T>(
  data: T,
  status = 200,
): Response {
  const body: ApiResponse<T> = { ok: true, data, error: null };
  return Response.json(body, { status });
}

export function friendsErrorResponse(
  error: unknown,
  internalMessage: string,
): Response {
  if (error instanceof FriendDataError) {
    switch (error.code) {
      case 'INVALID_INPUT':
        return errorResponse(400, 'INVALID_INPUT', error.message);
      case 'NOT_FOUND':
        return errorResponse(
          404,
          'NOT_FOUND',
          error.message,
          error.details,
        );
      case 'FORBIDDEN':
        return errorResponse(
          403,
          'UNAUTHORIZED',
          error.message,
          error.details,
        );
      case 'CONFLICT':
      case 'COOLDOWN':
        return errorResponse(
          409,
          'CONFLICT',
          error.message,
          error.details,
        );
    }
  }

  console.error(`[friends] ${internalMessage}`, error);
  return errorResponse(500, 'INTERNAL_ERROR', internalMessage);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function readFriendRequestBody(
  request: Request,
): Promise<Record<string, unknown>> {
  let value: unknown;
  try {
    value = await request.json();
  } catch {
    throw new FriendDataError('INVALID_INPUT', 'Invalid JSON body.');
  }

  if (!isRecord(value)) {
    throw new FriendDataError(
      'INVALID_INPUT',
      'Request body must be a JSON object.',
    );
  }
  return value;
}

export function parseAddresseeId(
  body: Record<string, unknown>,
  userId: string,
): string {
  return validateAddresseeId(body.addressee_id, userId);
}

export function parseConnectionId(
  params: Record<string, string>,
): string {
  return validateUuid(params.id, 'connection id');
}

export function parseUsernamePrefix(request: Request): string {
  const url = new URL(request.url);
  return validateUsernamePrefix(url.searchParams.get('q'));
}
