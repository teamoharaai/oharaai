import { authedFetch } from '@/lib/api/client';
import type {
  FinishSessionResult,
  SessionEventType,
  SessionSummaryDraft,
  StartSessionInput,
  StartSessionResult,
} from '@/features/sessions/types';

type ErrorBody = { error?: string; message?: string };

async function readResponse<T>(response: Response): Promise<T> {
  const body = (await response.json()) as T & ErrorBody;
  if (!response.ok) {
    throw new Error(body.error ?? body.message ?? `Request failed (${response.status})`);
  }
  return body as T;
}

export async function startSession(input: StartSessionInput): Promise<StartSessionResult> {
  const response = await authedFetch('/api/sessions/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return readResponse<StartSessionResult>(response);
}

export async function recordChange(
  sessionId: string,
  input: {
    idempotencyKey: string;
    type: SessionEventType;
    payload: Record<string, unknown>;
  },
): Promise<{ eventId: string }> {
  const response = await authedFetch(`/api/sessions/${sessionId}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return readResponse<{ eventId: string }>(response);
}

export async function finishSession(
  sessionId: string,
  input: { idempotencyKey: string; summary: SessionSummaryDraft },
): Promise<FinishSessionResult> {
  const response = await authedFetch(`/api/sessions/${sessionId}/finish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return readResponse<FinishSessionResult>(response);
}

// Publishing is deliberately separate from finishSession. Calling this method
// is the user's explicit approval that turns a reviewable draft into durable
// Echo memory.
export async function publishSession(
  sessionId: string,
  input: { idempotencyKey: string; title: string; approved: true },
): Promise<{ entryId: string; status: 'published' }> {
  const response = await authedFetch(`/api/sessions/${sessionId}/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return readResponse<{ entryId: string; status: 'published' }>(response);
}
