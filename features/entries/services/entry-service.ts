import { authedFetch, UnauthorizedError } from '@/lib/api/client';
import type { EntryDraft, EntryGoalOption, EntryRecord, EntryType } from '../types';

type SerializedEntry = Omit<EntryRecord, 'createdAt' | 'updatedAt' | 'completedAt'> & {
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

function hydrateEntry(entry: SerializedEntry): EntryRecord {
  return {
    ...entry,
    createdAt: new Date(entry.createdAt),
    updatedAt: new Date(entry.updatedAt),
    completedAt: entry.completedAt ? new Date(entry.completedAt) : null,
  };
}

async function responseBody<T>(response: Response): Promise<T> {
  const body = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(body.error || 'Entry request failed');
  return body;
}

export async function fetchEntries(entryType?: EntryType): Promise<EntryRecord[]> {
  const suffix = entryType ? `?type=${entryType}` : '';
  const response = await authedFetch(`/api/entries/library${suffix}`);
  const body = await responseBody<{ entries: SerializedEntry[] }>(response);
  return body.entries.map(hydrateEntry);
}

export async function fetchEntryGoalOptions(): Promise<EntryGoalOption[]> {
  const response = await authedFetch('/api/entries/context');
  const body = await responseBody<{ goals: EntryGoalOption[] }>(response);
  return body.goals;
}

export async function fetchEntry(entryId: string): Promise<EntryRecord | null> {
  const response = await authedFetch(`/api/entries/library/${entryId}`);
  if (response.status === 404) return null;
  const body = await responseBody<{ entry: SerializedEntry }>(response);
  return hydrateEntry(body.entry);
}

export async function createEntry(draft: EntryDraft): Promise<EntryRecord> {
  const response = await authedFetch('/api/entries/library', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(draft),
  });
  const body = await responseBody<{ entry: SerializedEntry }>(response);
  return hydrateEntry(body.entry);
}

export async function updateEntry(entryId: string, draft: EntryDraft): Promise<EntryRecord> {
  const response = await authedFetch(`/api/entries/library/${entryId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(draft),
  });
  const body = await responseBody<{ entry: SerializedEntry }>(response);
  return hydrateEntry(body.entry);
}

export async function deleteEntry(entryId: string): Promise<void> {
  const response = await authedFetch(`/api/entries/library/${entryId}`, { method: 'DELETE' });
  if (!response.ok && response.status !== 404) {
    const body = await response.json().catch(() => ({ error: 'Could not delete entry' })) as {
      error?: string;
    };
    throw new Error(body.error || 'Could not delete entry');
  }
}

export function isPersistenceUnavailable(error: unknown): boolean {
  if (error instanceof UnauthorizedError) return false;
  const message = error instanceof Error ? error.message : String(error);
  return /network|fetch|offline|temporarily|unavailable/i.test(message);
}
