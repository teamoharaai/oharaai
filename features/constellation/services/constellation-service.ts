import {
  authedFetch,
  UnauthorizedError,
} from '@/lib/api/client';
import {
  parseConstellationAnnotationDTO,
  parseConstellationGraphDTO,
} from '../dto';
import type {
  ConstellationAnnotationDTO,
  ConstellationGraphDTO,
  CreateConstellationAnnotationInput,
  UpdateConstellationAnnotationInput,
} from '../types';

export class ConstellationServiceError extends Error {
  readonly retryable: boolean;

  constructor(message: string, retryable = true) {
    super(message);
    this.name = 'ConstellationServiceError';
    this.retryable = retryable;
  }
}

function isAbortError(error: unknown): boolean {
  return (
    (typeof DOMException !== 'undefined'
      && error instanceof DOMException
      && error.name === 'AbortError')
    || (
      error instanceof Error
      && error.name === 'AbortError'
    )
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mutationMessage(
  value: unknown,
  fallback: string,
): string {
  if (
    isRecord(value)
    && value.ok === false
    && isRecord(value.error)
    && typeof value.error.message === 'string'
  ) {
    return value.error.message;
  }
  return fallback;
}

async function mutateAnnotation(
  path: string,
  init: RequestInit,
  fallback: string,
): Promise<ConstellationAnnotationDTO> {
  let response: Response;
  try {
    response = await authedFetch(path, init);
  } catch (error) {
    if (isAbortError(error)) throw error;
    if (error instanceof UnauthorizedError) {
      throw new ConstellationServiceError(
        'Your session ended. Sign in again to save this annotation.',
        false,
      );
    }
    throw new ConstellationServiceError(
      'The annotation could not be saved. Check your connection and try again.',
    );
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new ConstellationServiceError(
      response.ok ? `${fallback} The response was unreadable.` : fallback,
      response.status >= 500 || response.status === 408 || response.status === 429,
    );
  }

  if (!response.ok) {
    throw new ConstellationServiceError(
      mutationMessage(body, fallback),
      response.status >= 500 || response.status === 408 || response.status === 429,
    );
  }

  const annotation = isRecord(body) && body.ok === true
    ? parseConstellationAnnotationDTO(body.data)
    : null;
  if (!annotation) {
    throw new ConstellationServiceError(
      `${fallback} The response was invalid.`,
    );
  }
  return annotation;
}

export function createConstellationAnnotation(
  input: CreateConstellationAnnotationInput,
  signal?: AbortSignal,
): Promise<ConstellationAnnotationDTO> {
  return mutateAnnotation(
    '/api/constellation/annotations',
    {
      body: JSON.stringify(input),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
      signal,
    },
    'The annotation could not be created.',
  );
}

export function updateConstellationAnnotation(
  annotationId: string,
  input: UpdateConstellationAnnotationInput,
  signal?: AbortSignal,
): Promise<ConstellationAnnotationDTO> {
  return mutateAnnotation(
    `/api/constellation/annotations/${encodeURIComponent(annotationId)}`,
    {
      body: JSON.stringify(input),
      headers: { 'content-type': 'application/json' },
      method: 'PATCH',
      signal,
    },
    'The annotation could not be updated.',
  );
}

export function archiveConstellationAnnotation(
  annotationId: string,
  signal?: AbortSignal,
): Promise<ConstellationAnnotationDTO> {
  return mutateAnnotation(
    `/api/constellation/annotations/${encodeURIComponent(annotationId)}/archive`,
    { method: 'POST', signal },
    'The annotation could not be archived.',
  );
}

export async function fetchConstellationGraph(
  signal?: AbortSignal,
): Promise<ConstellationGraphDTO> {
  let response: Response;
  try {
    response = await authedFetch('/api/constellation', { signal });
  } catch (error) {
    if (isAbortError(error)) throw error;
    if (error instanceof UnauthorizedError) {
      throw new ConstellationServiceError(
        'Your session ended. Sign in again to view Constellation.',
        false,
      );
    }
    throw new ConstellationServiceError(
      'Constellation could not be reached. Check your connection and try again.',
    );
  }

  if (!response.ok) {
    throw new ConstellationServiceError(
      'Constellation could not be loaded. Please try again.',
      response.status >= 500 || response.status === 408 || response.status === 429,
    );
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new ConstellationServiceError(
      'Constellation returned an unreadable response.',
    );
  }

  const graph = parseConstellationGraphDTO(body);
  if (!graph) {
    throw new ConstellationServiceError(
      'Constellation returned an invalid response.',
    );
  }

  return graph;
}
