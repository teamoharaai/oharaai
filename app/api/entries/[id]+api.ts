import { isDatabaseConfigured, createAuthedClient } from '@/lib/db/client';
import { withAuth, type AuthContext } from '@/lib/api/auth';
import { isEntryOwnedByUser } from '@/lib/db/echo-entry-links';
import { buildEchoEmbeddingText } from '@/lib/ai/embedding-text';
import { generateEmbedding } from '@/lib/ai/embeddings';
import { EMBEDDING_MODEL } from '@/lib/ai/constants';

// ─── Input sanitization ───────────────────────────────────────────────────────
// Same discipline as app/api/entries/[id]/move+api.ts. Unlike the client-side
// createEntry() (features/echo/services/echo-service.ts), which never length-caps
// content, this route caps both content and title so an edit can't grow a row
// unboundedly. (createEntry's unbounded-content path is a latent gap there; it is
// intentionally NOT replicated here.)

const MAX_ID_LENGTH = 255;
const MAX_TITLE_LENGTH = 200;
const MAX_CONTENT_LENGTH = 20000;

function sanitizeString(input: unknown, maxLength: number): string {
  if (typeof input !== 'string') throw new Error('Expected string');
  const cleaned = input
    .replace(/\0/g, '')
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  const trimmed = cleaned.trim();
  if (trimmed.length === 0) throw new Error('Value cannot be empty');
  if (trimmed.length > maxLength) throw new Error(`Value exceeds ${maxLength} character limit`);
  return trimmed;
}

// title is nullable/clearable (createEntry accepts title: string | null): an
// explicit null or an empty/whitespace string clears it; anything else is
// sanitized + capped like content.
function sanitizeTitle(input: unknown): string | null {
  if (input === null) return null;
  if (typeof input === 'string' && input.trim().length === 0) return null;
  return sanitizeString(input, MAX_TITLE_LENGTH);
}

// ─── PATCH /api/entries/:id ───────────────────────────────────────────────────
// Body: { content?: string, title?: string | null } — at least one field.
//
// Server-side edit + re-embed. The re-embed happens here, inline, using the same
// buildEchoEmbeddingText → generateEmbedding logic createEntry's STEP 1 uses —
// NOT via a client-side generateEmbedding call. Only re-embeds when content
// actually changed (a title-only edit touches nothing else). When content
// changed on an entry that requested an AI insight, the stale reflection is
// cleared and ai_status is flipped to 'pending' so the existing echo/reconcile
// job re-summarizes the new text (reconcile itself is untouched).

interface UpdateEntryBody {
  content?: unknown;
  title?: unknown;
}

export async function PATCH(
  request: Request,
  params: Record<string, string>,
): Promise<Response> {
  if (!isDatabaseConfigured) {
    return Response.json({ error: 'Database not configured' }, { status: 503 });
  }
  return withAuth(handlePatch)(request, params);
}

async function handlePatch(
  request: Request,
  params: Record<string, string>,
  auth: AuthContext,
): Promise<Response> {
  let entryId: string;
  try {
    entryId = sanitizeString(params.id, MAX_ID_LENGTH);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid request';
    return Response.json({ error: message }, { status: 400 });
  }

  let body: UpdateEntryBody;
  try {
    body = (await request.json()) as UpdateEntryBody;
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const hasContent = body.content !== undefined;
  const hasTitle = body.title !== undefined;
  if (!hasContent && !hasTitle) {
    return Response.json(
      { error: 'Provide at least one of: content, title' },
      { status: 400 },
    );
  }

  let newContent: string | undefined;
  let newTitle: string | null | undefined;
  try {
    if (hasContent) newContent = sanitizeString(body.content, MAX_CONTENT_LENGTH);
    if (hasTitle) newTitle = sanitizeTitle(body.title);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid request';
    return Response.json({ error: message }, { status: 400 });
  }

  try {
    const authedDb = createAuthedClient(auth.accessToken);

    // Ownership gate — 404 if not owned, same as Delete/Move.
    const ownsEntry = await isEntryOwnedByUser(entryId, auth.userId, authedDb);
    if (!ownsEntry) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    // Read current state to (a) tell whether content actually changed and
    // (b) know whether an AI insight was requested (drives the reflection reset).
    const { data: current, error: readError } = await authedDb
      .from('echo_entries')
      .select('content, title, ai_insight_requested')
      .eq('id', entryId)
      .maybeSingle();

    if (readError) throw readError;
    if (!current) {
      // Raced with a delete between the ownership check and this read.
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    const currentRow = current as {
      content: string;
      title: string | null;
      ai_insight_requested: boolean;
    };

    const contentChanged = hasContent && newContent !== currentRow.content;

    // Base update: whichever fields the caller sent.
    const update: Record<string, unknown> = {};
    if (hasContent) update.content = newContent;
    if (hasTitle) update.title = newTitle;

    let embeddingText: string | null = null;
    if (contentChanged) {
      embeddingText = buildEchoEmbeddingText(newContent as string);
      // Re-embed inline below when there's embeddable text. When the new content
      // is too short to embed, the old vector embeds text that no longer exists —
      // clear it rather than leave it stale.
      update.embedding_text = embeddingText;
      if (!embeddingText) {
        update.embedding = null;
        update.embedding_model = null;
      }

      // Only a content change invalidates a prior reflection. And only reset it
      // for entries that requested an insight — a never-reflected entry has
      // nothing to clear and must not be flipped into the reconcile queue.
      if (currentRow.ai_insight_requested) {
        update.ai_status = 'pending'; // existing reconcile job picks this up
        update.ai_response = null;
        update.summarized = false;
        update.processed_at = null;
        // AI-written reflection columns (mirrors what reflect/reconcile write).
        // brt_user is user-authored, not a reflection output — leave it.
        update.brt = null;
        update.brt_ai = null;
        update.emotion = null;
        update.confidence = null;
        update.model_version = null;
        // Fresh reflection cycle: give reconcile a clean retry budget.
        update.retry_count = 0;
        update.last_attempted_at = null;
      }
    }

    const { error: updateError } = await authedDb
      .from('echo_entries')
      .update(update)
      .eq('id', entryId);

    if (updateError) throw updateError;

    // ─── Re-embed inline (server-side) ──────────────────────────────────────
    // Same generation logic as createEntry's STEP 1, run here instead of on the
    // client. Embedding failure is non-blocking: the edit already committed
    // above, so we log and still return success (matching createEntry, where
    // a save is never blocked on the embedding write).
    if (contentChanged && embeddingText) {
      try {
        const vector = await generateEmbedding(embeddingText, 'document');
        if (vector) {
          await authedDb
            .from('echo_entries')
            .update({
              embedding: vector as unknown as number[], // pgvector accepts number[]
              embedding_model: EMBEDDING_MODEL,
            })
            .eq('id', entryId);
        }
      } catch (err) {
        console.error(JSON.stringify({
          event: 'embedding_write_failed',
          table: 'echo_entries',
          record_id: entryId,
          error: err instanceof Error ? err.message : 'unknown',
          timestamp: new Date().toISOString(),
        }));
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    console.error('[entries] PATCH failed', { entryId, error: message });
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── DELETE /api/entries/:id ──────────────────────────────────────────────────
// Hard-deletes an Echo entry the caller owns. The interests.source_thorn_id FK
// is ON DELETE SET NULL, so any interests row derived from this entry keeps its
// row and only nulls its provenance pointer — non-blocking, no consumer reads it.

export async function DELETE(
  request: Request,
  params: Record<string, string>,
): Promise<Response> {
  if (!isDatabaseConfigured) {
    return Response.json({ error: 'Database not configured' }, { status: 503 });
  }
  return withAuth(handleDelete)(request, params);
}

async function handleDelete(
  _request: Request,
  params: Record<string, string>,
  auth: AuthContext,
): Promise<Response> {
  let entryId: string;
  try {
    entryId = sanitizeString(params.id, MAX_ID_LENGTH);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid request';
    return Response.json({ error: message }, { status: 400 });
  }

  try {
    const authedDb = createAuthedClient(auth.accessToken);

    const ownsEntry = await isEntryOwnedByUser(entryId, auth.userId, authedDb);
    if (!ownsEntry) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    const { error } = await authedDb.from('echo_entries').delete().eq('id', entryId);
    if (error) throw error;

    return Response.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    console.error('[entries] DELETE failed', { entryId, error: message });
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
