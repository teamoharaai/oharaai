import supabase from '@/lib/db/client';
import { getGeneralFolderId } from '@/lib/db/echo-folders';
import { AI_CONFIG } from '@/lib/ai/config';
import type { AiResponse } from '@/lib/ai/contracts';
import { buildEchoEmbeddingText } from '@/lib/ai/embedding-text';
import { generateEmbedding } from '@/lib/ai/embeddings';
import { EMBEDDING_MODEL } from '@/lib/ai/constants';
import type { EchoFolder } from '@/types/echo-folder';
import type { EchoEntry } from '../types';

type DbGoalRef = { id: string; title: string } | null;
type DbBrt = EchoEntry['brt'] | null;
type DbEmotion = EchoEntry['emotion'] | null;

type DbEchoEntry = {
  id: string;
  user_id: string;
  goal_id: string | null;
  title: string | null;
  content: string;
  media_url: string | null;
  ai_insight_requested: boolean;
  brt: DbBrt;
  brt_ai: DbBrt;
  brt_user: DbBrt;
  emotion: DbEmotion;
  model_version: string | null;
  visibility: EchoEntry['visibility'];
  confidence: number | null;
  themes: string[] | null;
  ai_response: string | null;
  processed_at: string | null;
  created_at: string;
  goals: DbGoalRef;
};

function mapEntry(row: DbEchoEntry): EchoEntry {
  return {
    id: row.id,
    userId: row.user_id,
    goalId: row.goal_id,
    goalTitle: row.goals?.title ?? undefined,
    title: row.title ?? undefined,
    content: row.content,
    mediaUrl: row.media_url ?? undefined,
    aiInsightRequested: row.ai_insight_requested,
    brt: row.brt_user ?? row.brt_ai ?? row.brt ?? undefined,
    emotion: row.emotion ?? undefined,
    modelVersion: row.model_version ?? undefined,
    visibility: row.visibility,
    confidence: row.confidence ?? undefined,
    themes: row.themes ?? undefined,
    aiResponse: row.ai_response ?? undefined,
    processedAt: row.processed_at ? new Date(row.processed_at) : undefined,
    createdAt: new Date(row.created_at),
  };
}

// ─── Canonical container overlay (Session 4.1) ─────────────────────────────
// The pill an entry shows must come from its confirmed echo_entry_links row —
// the canonical container — NOT the legacy echo_entries.goal_id join baked
// into mapEntry. A move only rewrites echo_entry_links (never echo_entries.
// goal_id), so on reload the legacy join is stale (still shows the old goal).
// fetchConfirmedContainers reads the same confirmed=true, single-container-
// per-entry shape getEntryContainer uses, batched to avoid N+1, and resolves
// the display name (goal title / folder name). applyContainer then overlays
// it onto a mapped entry. Entries with no confirmed link fall back to
// mapEntry's legacy-derived pill (which is null → no pill for never-linked
// entries), so the UI degrades sensibly and never crashes.

type ConfirmedContainerDisplay =
  | { type: 'goal'; goalId: string; goalTitle?: string }
  | { type: 'folder'; folderName?: string };

type DbConfirmedLinkRow = {
  echo_entry_id: string;
  container_type: 'goal' | 'folder';
  goal_id: string | null;
  folder_id: string | null;
};

async function fetchConfirmedContainers(
  entryIds: string[],
): Promise<Map<string, ConfirmedContainerDisplay>> {
  const result = new Map<string, ConfirmedContainerDisplay>();
  if (entryIds.length === 0) return result;

  // RLS scopes echo_entry_links via echo_entries.user_id = auth.uid(), so the
  // session client only ever sees the caller's own links.
  const { data: linkData, error } = await supabase
    .from('echo_entry_links')
    .select('echo_entry_id, container_type, goal_id, folder_id')
    .in('echo_entry_id', entryIds)
    .eq('confirmed', true);

  if (error || !linkData) return result;
  const links = linkData as unknown as DbConfirmedLinkRow[];

  const goalIds = [
    ...new Set(
      links.filter((l) => l.container_type === 'goal' && l.goal_id).map((l) => l.goal_id as string),
    ),
  ];
  const folderIds = [
    ...new Set(
      links
        .filter((l) => l.container_type === 'folder' && l.folder_id)
        .map((l) => l.folder_id as string),
    ),
  ];

  // Batch-resolve display names (two-step lookup, matching the codebase's
  // existing echo_entry_links pattern rather than a PostgREST embed).
  const [goalRes, folderRes] = await Promise.all([
    goalIds.length
      ? supabase.from('goals').select('id, title').in('id', goalIds)
      : Promise.resolve({ data: [] as Array<{ id: string; title: string }> }),
    folderIds.length
      ? supabase.from('echo_folders').select('id, name').in('id', folderIds)
      : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
  ]);

  const goalTitleById = new Map(
    ((goalRes.data as Array<{ id: string; title: string }>) ?? []).map((g) => [g.id, g.title]),
  );
  const folderNameById = new Map(
    ((folderRes.data as Array<{ id: string; name: string }>) ?? []).map((f) => [f.id, f.name]),
  );

  for (const link of links) {
    // At most one confirmed row per entry (enforced by migration 016). If a
    // duplicate ever slips through, keep the first and ignore the rest rather
    // than picking arbitrarily per render.
    if (result.has(link.echo_entry_id)) continue;
    if (link.container_type === 'goal' && link.goal_id) {
      result.set(link.echo_entry_id, {
        type: 'goal',
        goalId: link.goal_id,
        goalTitle: goalTitleById.get(link.goal_id),
      });
    } else if (link.container_type === 'folder' && link.folder_id) {
      result.set(link.echo_entry_id, {
        type: 'folder',
        folderName: folderNameById.get(link.folder_id),
      });
    }
  }

  return result;
}

function applyContainer(entry: EchoEntry, container: ConfirmedContainerDisplay | undefined): EchoEntry {
  if (!container) return entry; // no confirmed link → keep mapEntry's legacy pill
  if (container.type === 'folder') {
    return {
      ...entry,
      goalId: null,
      goalTitle: undefined,
      folderName: container.folderName,
    };
  }
  return {
    ...entry,
    goalId: container.goalId,
    goalTitle: container.goalTitle,
    folderName: undefined,
  };
}

type ReflectPayload = {
  reflection: string | null;
  emotion: EchoEntry['emotion'] | null;
  brt: EchoEntry['brt'] | null;
  confidence: number | null;
  summarized: boolean;
  disabled?: boolean;
};

export type CreateEntryResultStatus =
  | 'saved'
  | 'saved_without_summary'
  | 'rate_limited'
  | 'offline'
  | 'unconfirmed';

export type SubmissionFailureStatus = Extract<CreateEntryResultStatus, 'offline' | 'unconfirmed'>;

export type CreateEntryResult = {
  status: CreateEntryResultStatus;
  entry?: EchoEntry;
};

function isNetworkError(error: unknown): boolean {
  if (!error) return false;

  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'message' in error
        ? String(error.message)
        : String(error);

  return /network request failed|failed to fetch|networkerror|load failed|offline/i.test(message);
}

export function getSubmissionFailureStatus(error: unknown): SubmissionFailureStatus {
  return isNetworkError(error) ? 'offline' : 'unconfirmed';
}

async function requestEchoReflection(
  content: string,
  aiInsightRequested: boolean,
  accessToken: string,
  echoEntryId: string,
): Promise<ReflectPayload | null> {
  if (!aiInsightRequested) {
    return null;
  }

  if (!accessToken.trim()) {
    throw new Error('Missing access token for Echo reflection request');
  }

  const response = await fetch('/api/echo/reflect', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      content,
      aiInsightRequested,
      echo_entry_id: echoEntryId,
    }),
  });

  let body: AiResponse<ReflectPayload>;
  try {
    body = (await response.json()) as AiResponse<ReflectPayload>;
  } catch {
    throw new Error('Echo reflection request failed');
  }

  if (!body.ok) {
    const { code, message } = body.error;
    if (response.status === 429 && code === 'RATE_LIMITED') {
      const error = new Error(message);
      error.name = 'RateLimitedEchoReflectionError';
      throw error;
    }
    throw new Error(message);
  }

  return body.data;
}

export async function fetchEntries(userId: string): Promise<EchoEntry[]> {
  const { data, error } = await supabase
    .from('echo_entries')
    .select('*, goals(id, title)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  const entries = (data as unknown as DbEchoEntry[]).map(mapEntry);
  const containers = await fetchConfirmedContainers(entries.map((e) => e.id));
  return entries.map((e) => applyContainer(e, containers.get(e.id)));
}

export async function getEntryById(entryId: string): Promise<EchoEntry | null> {
  const { data, error } = await supabase
    .from('echo_entries')
    .select('*, goals(id, title)')
    .eq('id', entryId)
    .single();

  if (error || !data) return null;
  const entry = mapEntry(data as unknown as DbEchoEntry);
  const containers = await fetchConfirmedContainers([entry.id]);
  return applyContainer(entry, containers.get(entry.id));
}

export async function createEntry(params: {
  userId: string;
  content: string;
  goalId: string | null;
  aiInsightRequested: boolean;
  brt: EchoEntry['brt'] | null;
  emotion: EchoEntry['emotion'] | null;
  title: string | null;
}): Promise<CreateEntryResult> {
  const embeddingText = buildEchoEmbeddingText(params.content);

  let data: DbEchoEntry | null = null;
  let error: unknown = null;
  try {
    const result = await supabase
      .from('echo_entries')
      .insert({
        user_id: params.userId,
        content: params.content,
        // goal_id is intentionally omitted (defaults to null) — container
        // assignment now goes exclusively through echo_entry_links, below.
        // The column itself is preserved (root CLAUDE.md: "echo_entries.goal_id
        // is PRESERVED. Do not drop it"); only new-insert writes stop.
        ai_insight_requested: params.aiInsightRequested,
        brt: params.brt,
        emotion: params.emotion,
        title: params.title,
        embedding_text: embeddingText,
        ai_status: params.aiInsightRequested ? 'pending' : 'not_requested',
      })
      .select('*, goals(id, title)')
      .single();

    data = (result.data as DbEchoEntry | null) ?? null;
    error = result.error;
  } catch (insertError) {
    return { status: getSubmissionFailureStatus(insertError) };
  }

  if (error || !data) {
    return { status: getSubmissionFailureStatus(error) };
  }

  const insertedEntry = mapEntry(data as unknown as DbEchoEntry);

  // STEP 1 — Fire-and-forget embedding (non-blocking)
  // echo_entries must save even if embedding fails.
  if (embeddingText) {
    void generateEmbedding(embeddingText, 'document')
      .then(async (vector) => {
        if (vector) {
          await supabase
            .from('echo_entries')
            .update({
              embedding: vector as any, // pgvector accepts number[]
              embedding_model: EMBEDDING_MODEL,
            })
            .eq('id', insertedEntry.id);
        }
      })
      .catch((err) => {
        console.error(JSON.stringify({
          event: 'embedding_write_failed',
          table: 'echo_entries',
          record_id: insertedEntry.id,
          error: err instanceof Error ? err.message : 'unknown',
          timestamp: new Date().toISOString(),
        }));
      });
  }

  // STEP 2 — Container resolution (blocking — must complete before we return,
  // now that echo_entries.goal_id is no longer written on insert and the
  // legacy FK join in mapEntry can no longer supply goalId/goalTitle).
  //
  // Explicit goalId: confirmed link to that goal (manual).
  // No goalId: confirmed link to the caller's General folder — unconditional,
  // not gated on whether STEP 3's keyword heuristic below finds a match. An
  // unconfirmed ai_auto suggestion is advisory, not a container (migration
  // 016 only caps confirmed rows at one-per-entry; unconfirmed rows are
  // unconstrained), so both can coexist: the entry has a real confirmed home
  // in General while a pending suggestion still surfaces for the user to act
  // on separately.
  //
  // getGeneralFolderId() is a plain RLS-scoped read, not
  // getOrCreateGeneralFolderId() — that RPC is service_role-only (migration
  // 014) and this file executes client-side (called directly from
  // useEntries.ts), so it must never pull in the service-role client. Every
  // user's General folder is guaranteed to exist by signup time via the
  // eager provisioning trigger (migration 017); if it's still missing (a
  // failed/legacy provisioning), the container is skipped rather than
  // blocking the save, matching the non-blocking pattern used throughout.
  let confirmedContainer: ConfirmedContainerDisplay | undefined;

  if (params.goalId) {
    try {
      await supabase
        .from('echo_entry_links')
        .upsert(
          {
            echo_entry_id: insertedEntry.id,
            goal_id: params.goalId,
            container_type: 'goal',
            link_source: 'manual',
            confirmed: true,
          },
          { onConflict: 'echo_entry_id,goal_id', ignoreDuplicates: true },
        );

      const { data: goalRow } = await supabase
        .from('goals')
        .select('title')
        .eq('id', params.goalId)
        .maybeSingle();

      confirmedContainer = {
        type: 'goal',
        goalId: params.goalId,
        goalTitle: (goalRow as { title: string } | null)?.title,
      };
    } catch (err) {
      console.error('[echo-entry-links] manual insert failed:', err);
    }
  } else {
    try {
      const folderId = await getGeneralFolderId(params.userId);
      if (folderId) {
        await supabase
          .from('echo_entry_links')
          .upsert(
            {
              echo_entry_id: insertedEntry.id,
              folder_id: folderId,
              container_type: 'folder',
              link_source: 'system_default',
              confirmed: true,
            },
            { onConflict: 'echo_entry_id,folder_id', ignoreDuplicates: true },
          );
        // The General folder's name is server-enforced immutable ("The
        // General folder cannot be renamed" — app/api/folders/[id]+api.ts),
        // so it's safe to hardcode here rather than issuing a second query.
        confirmedContainer = { type: 'folder', folderName: 'General' };
      }
    } catch (err) {
      console.error('[echo-entry-links] general-folder assignment failed:', err);
    }
  }

  const containedEntry = applyContainer(insertedEntry, confirmedContainer);

  // STEP 3 — AI auto-linking (keyword match, non-blocking, advisory only)
  // Fires only when no goalId was provided. No AI calls — keyword heuristic only.
  // Phase 2: swap this IIFE body for an AI-backed classifier. Independent of
  // the General-folder assignment above — see the STEP 2 comment for why
  // both can coexist on the same entry.
  if (!params.goalId) {
    const echoContent = params.content;
    const userId = params.userId;
    const echoEntryId = insertedEntry.id;

    void (async () => {
      try {
        const { data: goals } = await supabase
          .from('goals')
          .select('id, title')
          .eq('user_id', userId)
          .eq('status', 'active');

        if (!goals?.length) return;

        const contentLower = echoContent.toLowerCase();

        const STOP_WORDS = new Set([
          'this', 'that', 'with', 'have', 'will', 'from', 'they', 'been', 'were',
        ]);

        let bestMatch: { goalId: string; score: number } | null = null;

        for (const goal of goals) {
          const words = goal.title
            .toLowerCase()
            .split(/\s+/)
            .filter((w: string) => w.length >= 4 && !STOP_WORDS.has(w));

          if (!words.length) continue;

          const matchCount = words.filter((w: string) => contentLower.includes(w)).length;
          const score = matchCount / words.length;

          if (score > 0.7 && (!bestMatch || score > bestMatch.score)) {
            bestMatch = { goalId: goal.id, score };
          }
        }

        if (bestMatch) {
          await supabase
            .from('echo_entry_links')
            .upsert(
              {
                echo_entry_id: echoEntryId,
                goal_id: bestMatch.goalId,
                container_type: 'goal',
                link_source: 'ai_auto',
                confirmed: false,
              },
              { onConflict: 'echo_entry_id,goal_id', ignoreDuplicates: true },
            );
        }
      } catch (err) {
        console.error('[echo-entry-links] ai_auto failed:', err);
      }
    })();
  }

  if (!params.aiInsightRequested) {
    return { status: 'saved', entry: containedEntry };
  }

  let reflectPayload: ReflectPayload | null;
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    reflectPayload = await requestEchoReflection(
      params.content,
      params.aiInsightRequested,
      session?.access_token ?? '',
      insertedEntry.id,
    );
  } catch (error) {
    void supabase
      .from('echo_entries')
      .update({ ai_status: 'failed', retry_count: 1, last_attempted_at: new Date().toISOString() })
      .eq('id', insertedEntry.id);
    if (error instanceof Error && error.name === 'RateLimitedEchoReflectionError') {
      return { status: 'rate_limited', entry: containedEntry };
    }

    return { status: 'saved_without_summary', entry: containedEntry };
  }

  if (reflectPayload?.disabled) {
    return { status: 'saved', entry: containedEntry };
  }

  if (!reflectPayload || !reflectPayload.summarized || !reflectPayload.reflection) {
    void supabase
      .from('echo_entries')
      .update({ ai_status: 'failed', retry_count: 1, last_attempted_at: new Date().toISOString() })
      .eq('id', insertedEntry.id);
    return { status: 'saved_without_summary', entry: containedEntry };
  }

  const processedAt = new Date().toISOString();
  const { data: updatedData, error: updateError } = await supabase
    .from('echo_entries')
    .update({
      ai_response: reflectPayload.reflection,
      emotion: reflectPayload.emotion,
      brt: reflectPayload.brt,
      brt_ai: reflectPayload.brt,
      confidence: reflectPayload.confidence,
      model_version: AI_CONFIG.models.default,
      processed_at: processedAt,
      summarized: true,
      ai_status: 'completed',
    })
    .eq('id', insertedEntry.id)
    .select('*, goals(id, title)')
    .single();

  if (updateError || !updatedData) {
    void supabase
      .from('echo_entries')
      .update({ ai_status: 'failed', retry_count: 1, last_attempted_at: new Date().toISOString() })
      .eq('id', insertedEntry.id);
    return { status: 'saved_without_summary', entry: containedEntry };
  }

  return {
    status: 'saved',
    entry: applyContainer(mapEntry(updatedData as unknown as DbEchoEntry), confirmedContainer),
  };
}

export async function fetchActiveGoalsForPicker(
  userId: string,
): Promise<Array<{ id: string; title: string }>> {
  const { data, error } = await supabase
    .from('goals')
    .select('id, title')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return data as Array<{ id: string; title: string }>;
}

// ─── Move to folder/goal (Session 4) ───────────────────────────────────────

export type EntryContainer =
  | { type: 'goal'; id: string }
  | { type: 'folder'; id: string };

type DbEntryContainerRow = {
  container_type: 'goal' | 'folder';
  goal_id: string | null;
  folder_id: string | null;
};

// Reads the entry's current confirmed container row directly (RLS-scoped via
// echo_entries.user_id = auth.uid(), same ownership check moveEntryContainer
// relies on server-side). Only touches the confirmed row, matching the move
// endpoint's semantics.
export async function getEntryContainer(entryId: string): Promise<EntryContainer | null> {
  const { data, error } = await supabase
    .from('echo_entry_links')
    .select('container_type, goal_id, folder_id')
    .eq('echo_entry_id', entryId)
    .eq('confirmed', true)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as unknown as DbEntryContainerRow;
  if (row.container_type === 'goal' && row.goal_id) return { type: 'goal', id: row.goal_id };
  if (row.container_type === 'folder' && row.folder_id) return { type: 'folder', id: row.folder_id };
  return null;
}

export async function fetchFolders(accessToken: string): Promise<EchoFolder[]> {
  if (!accessToken.trim()) return [];

  try {
    const response = await fetch('/api/folders', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) return [];

    const body = (await response.json()) as { folders?: EchoFolder[] };
    return body.folders ?? [];
  } catch {
    return [];
  }
}

// error kinds drive differentiated UI behavior (not just distinct copy):
//  - entry_not_found (404, entry gone): caller removes it from the list
//  - target_not_found (404, goal/folder vanished): caller refreshes the picker
//  - offline / server / generic: show copy, keep the modal as-is
// 401 is intentionally mapped to 'generic' with the server message — there is
// no app-wide re-auth interceptor to hand off to (see Session 4.1 notes), so
// we preserve the pre-existing "show the message" behavior rather than
// inventing a one-off flow here.
export type MoveEntryErrorKind =
  | 'entry_not_found'
  | 'target_not_found'
  | 'offline'
  | 'server'
  | 'generic';

export type MoveEntryResult =
  | { status: 'success' }
  | { status: 'error'; kind: MoveEntryErrorKind; message: string };

export async function moveEntryRequest(
  entryId: string,
  target: EntryContainer,
  accessToken: string,
): Promise<MoveEntryResult> {
  if (!accessToken.trim()) {
    return { status: 'error', kind: 'generic', message: 'Move failed. Please try again.' };
  }

  let response: Response;
  try {
    response = await fetch(`/api/entries/${entryId}/move`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ target_type: target.type, target_id: target.id }),
    });
  } catch {
    return {
      status: 'error',
      kind: 'offline',
      message: "You're offline. Try again once you're back online.",
    };
  }

  let body: { success?: boolean; error?: string };
  try {
    body = (await response.json()) as { success?: boolean; error?: string };
  } catch {
    return { status: 'error', kind: 'generic', message: 'Move failed. Please try again.' };
  }

  if (response.ok && body.success) {
    return { status: 'success' };
  }

  // Both "entry gone" and "target gone" surface as 404; the server
  // distinguishes them only by message text ('Not found' vs 'Target ...').
  if (response.status === 404) {
    if (/target/i.test(body.error ?? '')) {
      return {
        status: 'error',
        kind: 'target_not_found',
        message: 'That destination no longer exists — it may have been deleted. Pick another.',
      };
    }
    return {
      status: 'error',
      kind: 'entry_not_found',
      message: 'This entry no longer exists.',
    };
  }

  if (response.status === 500) {
    return {
      status: 'error',
      kind: 'server',
      message: 'Something went wrong. Please try again.',
    };
  }

  // 401 / 400 / 503 / anything else: keep existing behavior (surface the
  // server-provided message, falling back to generic copy).
  return {
    status: 'error',
    kind: 'generic',
    message: body.error ?? 'Move failed. Please try again.',
  };
}
