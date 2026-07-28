import {
  authedFetch,
  UnauthorizedError,
} from '@/lib/api/client';
import { parseConstellationGraphDTO } from '../dto';
import type { ConstellationGraphDTO } from '../types';

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
