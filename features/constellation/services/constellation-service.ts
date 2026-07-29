import {
  authedFetch,
  UnauthorizedError,
} from '@/lib/api/client';
import {
  parseConstellationAnnotationDTO,
  parseConstellationBrtInspectorDTO,
  parseConstellationEchoSearchDTO,
  parseConstellationEvidenceLinkDTO,
  parseConstellationGoalEvidenceDTO,
  parseConstellationGraphDTO,
  parseConstellationLayoutDTO,
  parseConstellationReflectionInspectorDTO,
} from '../dto';
import type {
  ConstellationAnnotationDTO,
  ConstellationBrtCategory,
  ConstellationBrtInspectorDTO,
  ConstellationDeleteResult,
  ConstellationEchoSearchDTO,
  ConstellationEvidenceLink,
  ConstellationGraphDTO,
  ConstellationGoalEvidenceDTO,
  ConstellationLayoutDTO,
  ConstellationLayoutPositionDTO,
  ConstellationReflectionInspectorDTO,
  CreateConstellationAnnotationInput,
  CreateConstellationEvidenceReferenceInput,
  SaveConstellationLayoutPositionInput,
  UpdateConstellationAnnotationInput,
  UpdateConstellationEvidenceReferenceInput,
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

async function evidenceRequest(
  path: string,
  init: RequestInit,
  fallback: string,
): Promise<unknown> {
  let response: Response;
  try {
    response = await authedFetch(path, init);
  } catch (error) {
    if (isAbortError(error)) throw error;
    if (error instanceof UnauthorizedError) {
      throw new ConstellationServiceError(
        'Your session ended. Sign in again to view private Constellation details.',
        false,
      );
    }
    throw new ConstellationServiceError(
      `${fallback} Check your connection and try again.`,
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
  return isRecord(body) && body.ok === true ? body.data : null;
}

export async function fetchConstellationGoalEvidence(
  goalId: string,
  signal?: AbortSignal,
): Promise<ConstellationGoalEvidenceDTO> {
  const data = await evidenceRequest(
    `/api/constellation/goals/${encodeURIComponent(goalId)}/evidence`,
    { method: 'GET', signal },
    'Goal evidence could not be loaded.',
  );
  const dto = parseConstellationGoalEvidenceDTO(data);
  if (!dto) {
    throw new ConstellationServiceError(
      'Goal evidence returned an invalid response.',
    );
  }
  return dto;
}

export async function fetchConstellationReflectionInspector(
  nodeId: string,
  signal?: AbortSignal,
): Promise<ConstellationReflectionInspectorDTO> {
  const data = await evidenceRequest(
    `/api/constellation/reflections/${encodeURIComponent(nodeId)}`,
    { method: 'GET', signal },
    'Reflection details could not be loaded.',
  );
  const dto = parseConstellationReflectionInspectorDTO(data);
  if (!dto || dto.nodeId !== nodeId) {
    throw new ConstellationServiceError(
      'Reflection details returned an invalid response.',
    );
  }
  return dto;
}

export async function fetchConstellationBrtInspector(
  goalId: string,
  category: ConstellationBrtCategory,
  signal?: AbortSignal,
): Promise<ConstellationBrtInspectorDTO> {
  const data = await evidenceRequest(
    `/api/constellation/goals/${encodeURIComponent(goalId)}/brt/${category}`,
    { method: 'GET', signal },
    `${category} entries could not be loaded.`,
  );
  const dto = parseConstellationBrtInspectorDTO(data);
  if (!dto || dto.goalId !== goalId || dto.category !== category) {
    throw new ConstellationServiceError(
      'BRT entries returned an invalid response.',
    );
  }
  return dto;
}

export async function searchConstellationEchoes(
  goalId: string,
  query: string,
  signal?: AbortSignal,
): Promise<ConstellationEchoSearchDTO> {
  const data = await evidenceRequest(
    `/api/constellation/goals/${encodeURIComponent(goalId)}/echo-options?query=${encodeURIComponent(query)}`,
    { method: 'GET', signal },
    'Entries could not be searched.',
  );
  const dto = parseConstellationEchoSearchDTO(data);
  if (!dto) {
    throw new ConstellationServiceError(
      'Entry search returned an invalid response.',
    );
  }
  return dto;
}

export async function createConstellationEvidenceReference(
  input: CreateConstellationEvidenceReferenceInput,
  signal?: AbortSignal,
): Promise<ConstellationEvidenceLink> {
  const data = await evidenceRequest(
    '/api/constellation/evidence-references',
    {
      body: JSON.stringify(input),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
      signal,
    },
    'The entry reference could not be added.',
  );
  const link = parseConstellationEvidenceLinkDTO(data);
  if (!link) {
    throw new ConstellationServiceError(
      'The entry reference returned an invalid response.',
    );
  }
  return link;
}

export async function updateConstellationEvidenceReference(
  evidenceReferenceId: string,
  input: UpdateConstellationEvidenceReferenceInput,
  signal?: AbortSignal,
): Promise<ConstellationEvidenceLink> {
  const data = await evidenceRequest(
    `/api/constellation/evidence-references/${encodeURIComponent(evidenceReferenceId)}`,
    {
      body: JSON.stringify(input),
      headers: { 'content-type': 'application/json' },
      method: 'PATCH',
      signal,
    },
    'The entry reference could not be updated.',
  );
  const link = parseConstellationEvidenceLinkDTO(data);
  if (!link) {
    throw new ConstellationServiceError(
      'The entry reference returned an invalid response.',
    );
  }
  return link;
}

export async function deleteConstellationEvidenceReference(
  evidenceReferenceId: string,
  signal?: AbortSignal,
): Promise<ConstellationDeleteResult> {
  const data = await evidenceRequest(
    `/api/constellation/evidence-references/${encodeURIComponent(evidenceReferenceId)}`,
    { method: 'DELETE', signal },
    'The entry reference could not be unlinked.',
  );
  if (
    !isRecord(data)
    || typeof data.id !== 'string'
    || data.id !== evidenceReferenceId
  ) {
    throw new ConstellationServiceError(
      'The unlink response was invalid.',
    );
  }
  return { id: data.id };
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

export async function fetchConstellationLayout(
  signal?: AbortSignal,
): Promise<ConstellationLayoutDTO> {
  const data = await evidenceRequest(
    '/api/constellation/layout',
    { method: 'GET', signal },
    'The Constellation layout could not be loaded.',
  );
  const dto = parseConstellationLayoutDTO(data);
  if (!dto) {
    throw new ConstellationServiceError(
      'The Constellation layout returned an invalid response.',
    );
  }
  return dto;
}

export async function saveConstellationLayoutPosition(
  input: SaveConstellationLayoutPositionInput,
  signal?: AbortSignal,
): Promise<ConstellationLayoutPositionDTO> {
  const data = await evidenceRequest(
    '/api/constellation/layout',
    {
      body: JSON.stringify(input),
      headers: { 'content-type': 'application/json' },
      method: 'PATCH',
      signal,
    },
    'The Constellation layout could not be saved.',
  );
  const dto = parseConstellationLayoutDTO({
    version: '1.0',
    positions: [data],
  });
  const position = dto?.positions[0];
  if (!position || position.selectionKey !== input.selectionKey) {
    throw new ConstellationServiceError(
      'The Constellation layout returned an invalid save response.',
    );
  }
  return position;
}

export async function resetConstellationLayout(
  signal?: AbortSignal,
): Promise<void> {
  const data = await evidenceRequest(
    '/api/constellation/layout',
    { method: 'DELETE', signal },
    'The Constellation layout could not be reset.',
  );
  if (!isRecord(data) || data.reset !== true) {
    throw new ConstellationServiceError(
      'The Constellation layout returned an invalid reset response.',
    );
  }
}
