import { withAuth, type AuthContext } from '@/lib/api/auth';
import { createAuthedClient, isDatabaseConfigured } from '@/lib/db/client';
import { buildEchoEmbeddingText } from '@/lib/ai/embedding-text';
import { generateEmbedding } from '@/lib/ai/embeddings';
import { EMBEDDING_MODEL } from '@/lib/ai/constants';
import {
  isRecord,
  renderSessionSummary,
  requiredString,
  requiredUuid,
  validateSessionSummary,
} from '@/lib/sessions/schema';

export async function POST(request: Request, params: Record<string, string>): Promise<Response> {
  if (!isDatabaseConfigured) {
    return Response.json({ error: 'Database not configured' }, { status: 503 });
  }
  return withAuth(handlePost)(request, params);
}

async function handlePost(
  request: Request,
  params: Record<string, string>,
  auth: AuthContext,
): Promise<Response> {
  try {
    const sessionId = requiredUuid(params.id, 'session id');
    const body = (await request.json()) as unknown;
    if (!isRecord(body)) throw new Error('Publish payload must be an object');
    const idempotencyKey = requiredString(body.idempotencyKey, 'idempotencyKey', 200);
    const title = requiredString(body.title, 'title', 200);
    if (body.approved !== true) {
      throw new Error('Explicit user approval is required before publishing');
    }

    const authedDb = createAuthedClient(auth.accessToken);
    const { data: session, error: readError } = await authedDb
      .from('echo_sessions')
      .select('summary, status, final_entry_id')
      .eq('id', sessionId)
      .maybeSingle();
    if (readError) throw readError;
    if (!session) return Response.json({ error: 'Session not found' }, { status: 404 });

    const summary = validateSessionSummary((session as { summary: unknown }).summary);
    const content = renderSessionSummary(summary);
    const embeddingText = buildEchoEmbeddingText(content);

    const { data, error } = await authedDb.rpc('publish_agent_session', {
      p_session_id: sessionId,
      p_idempotency_key: idempotencyKey,
      p_user_approved: true,
      p_title: title,
      p_content: content,
      p_embedding_text: embeddingText,
    });
    if (error) throw error;
    const entryId = data as string;

    if (embeddingText) {
      try {
        const vector = await generateEmbedding(embeddingText, 'document');
        if (vector) {
          const { error: embeddingError } = await authedDb
            .from('echo_entries')
            .update({ embedding: vector as unknown as number[], embedding_model: EMBEDDING_MODEL })
            .eq('id', entryId);
          if (embeddingError) throw embeddingError;
        }
      } catch (embeddingError) {
        console.error(JSON.stringify({
          event: 'embedding_write_failed',
          table: 'echo_entries',
          record_id: entryId,
          error: embeddingError instanceof Error ? embeddingError.message : 'unknown',
          timestamp: new Date().toISOString(),
        }));
      }
    }

    return Response.json({ entryId, status: 'published' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to publish session';
    const status = /not found/i.test(message) ? 404 : /must be reviewed/i.test(message) ? 409 : 400;
    return Response.json({ error: message }, { status });
  }
}
