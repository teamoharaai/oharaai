import type { CreateEntryResultStatus } from './services/echo-service';

export const ENTRY_TITLE_MAX_LENGTH = 200;
export const ENTRY_CONTENT_MAX_LENGTH = 20_000;

export type EchoEntryDraft = {
  title: string;
  content: string;
};

export const EMPTY_ECHO_ENTRY_DRAFT: EchoEntryDraft = {
  title: '',
  content: '',
};

export function isEntryDraftEmpty(draft: EchoEntryDraft): boolean {
  return draft.title.length === 0 && draft.content.length === 0;
}

export function canSubmitEntry(draft: EchoEntryDraft, isSaving = false): boolean {
  const title = draft.title.trim();
  const content = draft.content.trim();

  return (
    !isSaving
    && title.length > 0
    && title.length <= ENTRY_TITLE_MAX_LENGTH
    && content.length > 0
    && content.length <= ENTRY_CONTENT_MAX_LENGTH
  );
}

export function normalizeEntrySubmission(draft: EchoEntryDraft): EchoEntryDraft {
  return {
    title: draft.title.trim(),
    content: draft.content.trim(),
  };
}

export function isPersistedEntryStatus(
  status: CreateEntryResultStatus,
): status is Extract<
  CreateEntryResultStatus,
  'saved' | 'saved_without_summary' | 'rate_limited'
> {
  return (
    status === 'saved'
    || status === 'saved_without_summary'
    || status === 'rate_limited'
  );
}

export function migrateEchoDraftsByContext(
  value: unknown,
): Record<string, EchoEntryDraft> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value).flatMap(([contextKey, draft]) => {
      if (typeof draft === 'string') {
        return [[contextKey, { title: '', content: draft } satisfies EchoEntryDraft]];
      }

      if (!draft || typeof draft !== 'object' || Array.isArray(draft)) return [];
      const record = draft as Record<string, unknown>;
      if (typeof record.title !== 'string' || typeof record.content !== 'string') return [];

      return [[
        contextKey,
        { title: record.title, content: record.content } satisfies EchoEntryDraft,
      ]];
    }),
  );
}
