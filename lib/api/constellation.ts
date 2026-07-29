import type { ApiErrorCode, ApiResponse } from './contracts.ts';
import {
  ConstellationDataError,
} from '../../features/constellation/services/constellation-server-core.ts';
import type {
  CreateConstellationAnnotationInput,
  CreateConstellationEvidenceReferenceInput,
  UpdateConstellationAnnotationInput,
  UpdateConstellationEvidenceReferenceInput,
} from '../../features/constellation/types.ts';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ANNOTATION_LABEL_MAX_LENGTH = 120;
const ANNOTATION_BODY_MAX_LENGTH = 5_000;
const EVIDENCE_NOTE_MAX_LENGTH = 280;
const ECHO_SEARCH_QUERY_MAX_LENGTH = 120;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOwn(
  value: Record<string, unknown>,
  key: string,
): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

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

export function constellationUnauthorizedResponse(): Response {
  return errorResponse(401, 'UNAUTHORIZED', 'Unauthorized');
}

export function constellationSuccessResponse<T>(
  data: T,
  status = 200,
): Response {
  const body: ApiResponse<T> = { ok: true, data, error: null };
  return Response.json(body, { status });
}

export function constellationErrorResponse(
  error: unknown,
  internalMessage: string,
): Response {
  if (error instanceof ConstellationDataError) {
    switch (error.code) {
      case 'INVALID_INPUT':
        return errorResponse(400, 'INVALID_INPUT', error.message);
      case 'NOT_FOUND':
        return errorResponse(404, 'NOT_FOUND', error.message);
      case 'CONFLICT':
        return errorResponse(409, 'CONFLICT', error.message);
    }
  }

  console.error(`[constellation] ${internalMessage}`, error);
  return errorResponse(500, 'INTERNAL_ERROR', internalMessage);
}

function invalidInput(message: string): never {
  throw new ConstellationDataError('INVALID_INPUT', message);
}

async function readBody(request: Request): Promise<Record<string, unknown>> {
  let value: unknown;
  try {
    value = await request.json();
  } catch {
    return invalidInput('Invalid JSON body.');
  }

  if (!isRecord(value)) {
    return invalidInput('Request body must be a JSON object.');
  }
  return value;
}

function rejectUnknownKeys(
  body: Record<string, unknown>,
  allowedKeys: readonly string[],
): void {
  const allowed = new Set(allowedKeys);
  const unknown = Object.keys(body).find((key) => !allowed.has(key));
  if (unknown) {
    invalidInput(`Unexpected request field: ${unknown}.`);
  }
}

function parseUuid(value: unknown, fieldName: string): string {
  const normalized = typeof value === 'string'
    ? value.trim().toLowerCase()
    : '';
  if (!UUID_PATTERN.test(normalized)) {
    return invalidInput(`${fieldName} must be a valid UUID.`);
  }
  return normalized;
}

function parseAnnotationKind(value: unknown): 'note' | 'projection' {
  if (value !== 'note' && value !== 'projection') {
    return invalidInput('kind must be note or projection.');
  }
  return value;
}

function parseRequiredTrimmedString(
  value: unknown,
  fieldName: string,
  maxLength: number,
): string {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (normalized.length === 0 || normalized.length > maxLength) {
    return invalidInput(
      `${fieldName} must be between 1 and ${maxLength} characters.`,
    );
  }
  return normalized;
}

function parseNullableTrimmedString(
  value: unknown,
  fieldName: string,
  maxLength: number,
): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') {
    return invalidInput(`${fieldName} must be a string or null.`);
  }
  const normalized = value.trim();
  if (normalized.length === 0) return null;
  if (normalized.length > maxLength) {
    return invalidInput(
      `${fieldName} must not exceed ${maxLength} characters.`,
    );
  }
  return normalized;
}

function parseNullableUuid(value: unknown, fieldName: string): string | null {
  if (value === null || value === undefined) return null;
  return parseUuid(value, fieldName);
}

export function parseConstellationResourceId(
  params: Record<string, string>,
  fieldName: string,
): string {
  return parseUuid(params.id, fieldName);
}

export function parseConstellationBrtCategory(
  value: string | undefined,
): 'bud' | 'rose' | 'thorn' {
  if (value !== 'bud' && value !== 'rose' && value !== 'thorn') {
    return invalidInput('BRT category must be bud, rose, or thorn.');
  }
  return value;
}

export function parseConstellationEchoSearchQuery(
  request: Request,
): string {
  const value = new URL(request.url).searchParams.get('query') ?? '';
  const normalized = value.trim().replace(/\s+/g, ' ');
  if (normalized.length > ECHO_SEARCH_QUERY_MAX_LENGTH) {
    return invalidInput(
      `query must not exceed ${ECHO_SEARCH_QUERY_MAX_LENGTH} characters.`,
    );
  }
  return normalized;
}

export async function parseCreateAnnotationRequest(
  request: Request,
): Promise<CreateConstellationAnnotationInput> {
  const body = await readBody(request);
  rejectUnknownKeys(body, [
    'kind',
    'label',
    'body',
    'anchorEarnedNodeId',
    'anchorGoalId',
  ]);

  const anchorEarnedNodeId = parseNullableUuid(
    body.anchorEarnedNodeId,
    'anchorEarnedNodeId',
  );
  const anchorGoalId = parseNullableUuid(
    body.anchorGoalId,
    'anchorGoalId',
  );
  if (anchorEarnedNodeId && anchorGoalId) {
    return invalidInput(
      'Choose either anchorEarnedNodeId or anchorGoalId, not both.',
    );
  }

  return {
    kind: parseAnnotationKind(body.kind),
    label: parseRequiredTrimmedString(
      body.label,
      'label',
      ANNOTATION_LABEL_MAX_LENGTH,
    ),
    body: parseNullableTrimmedString(
      body.body,
      'body',
      ANNOTATION_BODY_MAX_LENGTH,
    ),
    anchorEarnedNodeId,
    anchorGoalId,
  };
}

export async function parseUpdateAnnotationRequest(
  request: Request,
): Promise<UpdateConstellationAnnotationInput> {
  const body = await readBody(request);
  rejectUnknownKeys(body, [
    'kind',
    'label',
    'body',
    'anchorEarnedNodeId',
    'anchorGoalId',
  ]);
  if (Object.keys(body).length === 0) {
    return invalidInput('At least one annotation field is required.');
  }

  const input: UpdateConstellationAnnotationInput = {};
  if (hasOwn(body, 'kind')) input.kind = parseAnnotationKind(body.kind);
  if (hasOwn(body, 'label')) {
    input.label = parseRequiredTrimmedString(
      body.label,
      'label',
      ANNOTATION_LABEL_MAX_LENGTH,
    );
  }
  if (hasOwn(body, 'body')) {
    input.body = parseNullableTrimmedString(
      body.body,
      'body',
      ANNOTATION_BODY_MAX_LENGTH,
    );
  }
  if (hasOwn(body, 'anchorEarnedNodeId')) {
    input.anchorEarnedNodeId = parseNullableUuid(
      body.anchorEarnedNodeId,
      'anchorEarnedNodeId',
    );
  }
  if (hasOwn(body, 'anchorGoalId')) {
    input.anchorGoalId = parseNullableUuid(
      body.anchorGoalId,
      'anchorGoalId',
    );
  }
  if (input.anchorEarnedNodeId && input.anchorGoalId) {
    return invalidInput(
      'Choose either anchorEarnedNodeId or anchorGoalId, not both.',
    );
  }
  return input;
}

// echoEntryId's BRT category is written separately via PATCH /api/entries/:id
// — this endpoint only creates/updates the (echo, goal, note) relation.
export async function parseCreateEvidenceReferenceRequest(
  request: Request,
): Promise<CreateConstellationEvidenceReferenceInput> {
  const body = await readBody(request);
  rejectUnknownKeys(body, [
    'echoEntryId',
    'goalId',
    'note',
  ]);

  const input: CreateConstellationEvidenceReferenceInput = {
    echoEntryId: parseUuid(body.echoEntryId, 'echoEntryId'),
    goalId: parseUuid(body.goalId, 'goalId'),
  };
  if (hasOwn(body, 'note')) {
    input.note = parseNullableTrimmedString(
      body.note,
      'note',
      EVIDENCE_NOTE_MAX_LENGTH,
    );
  }
  return input;
}

export async function parseUpdateEvidenceReferenceRequest(
  request: Request,
): Promise<UpdateConstellationEvidenceReferenceInput> {
  const body = await readBody(request);
  rejectUnknownKeys(body, ['note']);
  if (Object.keys(body).length === 0) {
    return invalidInput(
      'At least one evidence-reference field is required.',
    );
  }

  const input: UpdateConstellationEvidenceReferenceInput = {};
  if (hasOwn(body, 'note')) {
    input.note = parseNullableTrimmedString(
      body.note,
      'note',
      EVIDENCE_NOTE_MAX_LENGTH,
    );
  }
  return input;
}
