import supabase from '@/lib/db/client';
import { authedFetch, UnauthorizedError } from '@/lib/api/client';
import { AI_CONFIG } from '@/lib/ai/config';
import type { AiResponse } from '@/lib/ai/contracts';
import type { BrtCategory } from '@/lib/utils/resolveBrt';
import type { EchoFolder } from '@/types/echo-folder';
import type { EchoContainerOption, EchoEntry, EchoGoalOption } from '../types';
import {
  resolveDashboardLatestEntryResult,
  type DashboardLatestEntryRow,
  type DashboardLatestEntrySummary,
} from '../dashboard-latest-entry';

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
  brt_category: BrtCategory | null;
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
    brtCategory: row.brt_category ?? undefined,
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
  | { type: 'folder'; folderId: string; folderName?: string };

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
        folderId: link.folder_id,
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
      folderId: container.folderId,
      folderName: container.folderName,
    };
  }
  return {
    ...entry,
    goalId: container.goalId,
    goalTitle: container.goalTitle,
    folderId: undefined,
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
  echoEntryId: string,
): Promise<ReflectPayload | null> {
  if (!aiInsightRequested) {
    return null;
  }

  const response = await authedFetch('/api/echo/reflect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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

export async function fetchDashboardLatestEntry(
  userId: string,
): Promise<DashboardLatestEntrySummary | null> {
  const { data, error } = await supabase
    .from('entries')
    .select('id, plain_text, updated_at')
    .eq('user_id', userId)
    .eq('archived', false)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return resolveDashboardLatestEntryResult({
    data: data as DashboardLatestEntryRow | null,
    error,
  });
}

// Deletes an echo entry through the server route DELETE /api/entries/:id
// (withAuth + isEntryOwnedByUser → 404), the same server-side path Move/Edit use
// — NOT a direct RLS-scoped Supabase delete. Ownership is enforced server-side;
// the route cascades echo_entry_links and nulls interests.source_thorn_id.
// Keeps the Promise<void> / throw-on-failure contract the store's deleteEntry
// action and EchoScreen's try/catch depend on (same authedFetch mechanics as
// moveEntryRequest/updateEntry, minus the result-object return those need for
// their differentiated UX).
export async function deleteEntry(entryId: string): Promise<void> {
  const response = await authedFetch(`/api/entries/${entryId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    let message = 'Delete failed';
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // non-JSON body — keep the generic message
    }
    throw new Error(message);
  }
}

export async function createEntry(params: {
  content: string;
  goalId: string | null;
  aiInsightRequested: boolean;
  brt: EchoEntry['brt'] | null;
  emotion: EchoEntry['emotion'] | null;
  title: string;
}): Promise<CreateEntryResult> {
  let response: Response;
  try {
    response = await authedFetch('/api/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
  } catch (error) {
    return { status: getSubmissionFailureStatus(error) };
  }

  if (!response.ok) return { status: getSubmissionFailureStatus(new Error('Entry save failed')) };

  let createPayload: {
    entry: DbEchoEntry;
    container: ConfirmedContainerDisplay;
  };
  try {
    createPayload = (await response.json()) as typeof createPayload;
  } catch (error) {
    return { status: getSubmissionFailureStatus(error) };
  }

  // The database RPC commits the entry and its one confirmed goal/folder link
  // in the same transaction. A link failure now rolls the entry back instead
  // of returning a saved orphan. Embedding generation also moved server-side.
  const insertedEntry = mapEntry(createPayload.entry);
  const confirmedContainer = createPayload.container;
  const containedEntry = applyContainer(insertedEntry, confirmedContainer);

  // STEP 2 — AI auto-linking (keyword match, non-blocking, advisory only)
  // Fires only when no goalId was provided. No AI calls — keyword heuristic only.
  // Phase 2: swap this IIFE body for an AI-backed classifier. This advisory
  // suggestion is independent of the confirmed General-folder link returned
  // by the atomic create transaction, so both can coexist on one entry.
  if (!params.goalId) {
    const echoContent = params.content;
    const userId = insertedEntry.userId;
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
    reflectPayload = await requestEchoReflection(
      params.content,
      params.aiInsightRequested,
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

export async function fetchGoalsForPicker(
  userId: string,
): Promise<EchoGoalOption[]> {
  const { data, error } = await supabase
    .from('goals')
    .select('id, title, project_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  const goalRows = data as Array<{ id: string; title: string; project_id: string | null }>;
  const projectIds = [
    ...new Set(
      goalRows
        .map((goal) => goal.project_id)
        .filter((projectId): projectId is string => Boolean(projectId)),
    ),
  ];

  let projectTitleById = new Map<string, string>();
  if (projectIds.length > 0) {
    const { data: projectRows } = await supabase
      .from('projects')
      .select('id, title')
      .in('id', projectIds);

    projectTitleById = new Map(
      ((projectRows as Array<{ id: string; title: string }> | null) ?? []).map((project) => [
        project.id,
        project.title,
      ]),
    );
  }

  return goalRows.map((goal) => ({
    id: goal.id,
    title: goal.title,
    projectId: goal.project_id,
    projectTitle: goal.project_id ? projectTitleById.get(goal.project_id) ?? null : null,
  }));
}

export async function fetchContainerOptions(userId: string): Promise<{
  goals: EchoGoalOption[];
  folders: EchoFolder[];
  options: EchoContainerOption[];
}> {
  const [goals, folderResult] = await Promise.all([
    fetchGoalsForPicker(userId),
    supabase
      .from('echo_folders')
      .select('id, user_id, name, is_general, created_at, updated_at')
      .eq('user_id', userId)
      .order('is_general', { ascending: false })
      .order('name', { ascending: true }),
  ]);

  const folders =
    folderResult.error || !folderResult.data
      ? []
      : (folderResult.data as Array<{
          id: string;
          user_id: string;
          name: string;
          is_general: boolean;
          created_at: string;
          updated_at: string;
        }>).map((folder) => ({
          id: folder.id,
          userId: folder.user_id,
          name: folder.name,
          isGeneral: folder.is_general,
          createdAt: folder.created_at,
          updatedAt: folder.updated_at,
        }));

  const options: EchoContainerOption[] = [
    ...goals.map((goal): EchoContainerOption => ({
      type: 'goal',
      id: goal.id,
      label: goal.title,
      title: goal.title,
      projectId: goal.projectId,
      projectTitle: goal.projectTitle,
    })),
    ...folders.map((folder): EchoContainerOption => ({
      type: 'folder',
      id: folder.id,
      label: folder.name,
      name: folder.name,
      isGeneral: folder.isGeneral,
    })),
  ];

  return { goals, folders, options };
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

export async function fetchFolders(): Promise<EchoFolder[]> {
  try {
    const response = await authedFetch('/api/folders');
    if (!response.ok) return [];

    const body = (await response.json()) as { folders?: EchoFolder[] };
    return body.folders ?? [];
  } catch {
    return [];
  }
}

export async function createFolderRequest(name: string): Promise<EchoFolder> {
  let response: Response;
  try {
    response = await authedFetch('/api/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      throw new Error('Your session expired. Redirecting to sign in...');
    }
    throw new Error("You're offline. Try again once you're back online.");
  }

  let body: { folder?: EchoFolder; error?: string };
  try {
    body = (await response.json()) as { folder?: EchoFolder; error?: string };
  } catch {
    body = {};
  }

  if (response.ok && body.folder) {
    return body.folder;
  }

  throw new Error(body.error ?? 'Could not create folder. Please try again.');
}

// error kinds drive differentiated UI behavior (not just distinct copy):
//  - entry_not_found (404, entry gone): caller removes it from the list
//  - target_not_found (404, goal/folder vanished): caller refreshes the picker
//  - offline / server / generic: show copy, keep the modal as-is
// 401 never reaches this branch logic — authedFetch intercepts it, clears
// local session state, and redirects to login before this function sees a
// response. We just need to stop this promise chain from continuing.
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
): Promise<MoveEntryResult> {
  let response: Response;
  try {
    response = await authedFetch(`/api/entries/${entryId}/move`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_type: target.type, target_id: target.id }),
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return {
        status: 'error',
        kind: 'generic',
        message: 'Your session expired. Redirecting to sign in...',
      };
    }
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

  // 400 / 503 / anything else: surface the server-provided message, falling
  // back to generic copy.
  return {
    status: 'error',
    kind: 'generic',
    message: body.error ?? 'Move failed. Please try again.',
  };
}

// ─── Edit entry (content / title) ──────────────────────────────────────────
// PATCHes /api/entries/:id. The route does the content update AND the re-embed
// server-side (and resets a stale reflection when content changed on an
// insight-requested entry) — this client fn only ships the fields, same shape
// as moveEntryRequest. Send content and/or title; omit a field to leave it
// unchanged, or pass title: null to clear it.

export type UpdateEntryErrorKind = 'entry_not_found' | 'offline' | 'server' | 'generic';

export type UpdateEntryResult =
  | { status: 'success' }
  | { status: 'error'; kind: UpdateEntryErrorKind; message: string };

export async function updateEntry(
  entryId: string,
  changes: { content?: string; title?: string | null; brtCategory?: BrtCategory | null },
): Promise<UpdateEntryResult> {
  let response: Response;
  try {
    response = await authedFetch(`/api/entries/${entryId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(changes),
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return {
        status: 'error',
        kind: 'generic',
        message: 'Your session expired. Redirecting to sign in...',
      };
    }
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
    return { status: 'error', kind: 'generic', message: 'Save failed. Please try again.' };
  }

  if (response.ok && body.success) {
    return { status: 'success' };
  }

  if (response.status === 404) {
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

  // 400 / 503 / anything else: surface the server-provided message.
  return {
    status: 'error',
    kind: 'generic',
    message: body.error ?? 'Save failed. Please try again.',
  };
}
