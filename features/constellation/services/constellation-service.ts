import { authedFetch } from '@/lib/api/client';
import {
  parseDashboardSummary,
  type DashboardSummary,
} from '../gate';

export class ConstellationServiceError extends Error {
  readonly retryable: boolean;

  constructor(message: string, retryable = true) {
    super(message);
    this.name = 'ConstellationServiceError';
    this.retryable = retryable;
  }
}

export async function fetchDashboardSummary(
  signal?: AbortSignal,
): Promise<DashboardSummary> {
  const response = await authedFetch('/api/dashboard/summary', { signal });

  if (!response.ok) {
    throw new ConstellationServiceError(
      'Your activity progress could not be loaded.',
      response.status >= 500 || response.status === 408 || response.status === 429,
    );
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new ConstellationServiceError('The activity summary was not readable.');
  }

  const summary = parseDashboardSummary(body);
  if (!summary) {
    throw new ConstellationServiceError('The activity summary was not valid.');
  }

  return summary;
}
