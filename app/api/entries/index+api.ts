import { withAuth, type AuthContext } from '@/lib/api/auth';
import { createAuthedClient, isDatabaseConfigured } from '@/lib/db/client';
import { buildEchoEmbeddingText } from '@/lib/ai/embedding-text';
import { generateEmbedding } from '@/lib/ai/embeddings';
import { EMBEDDING_MODEL } from '@/lib/ai/constants';
import { isRecord, optionalString, optionalUuid, requiredString } from '@/lib/sessions/schema';

type ConfirmedContainer =
  | { type: 'goal'; goalId: string; goalTitle?: string }
  | { type: 'folder'; folderId: string; folderName?: string };

export async function POST(request: Request): Promise<Response> {
  if (!isDatabaseConfigured) {
    return Response.json({ error: 'Database not configured' }, { status: 503 });
  }
  return withAuth(handlePost)(request);
}

async function handlePost(
  request: Request,
  _params: Record<string, string>,
  auth: AuthContext,
): Promise<Response> {
  try {
    const body = (await request.json()) as unknown;
    if (!isRecord(body)) throw new Error('Entry payload must be an object');

    const content = requiredString(body.content, 'content', 20000);
    const title = optionalString(body.title, 'title', 200);
    const goalId = optionalUuid(body.goalId, 'goalId');
    const aiInsightRequested = body.aiInsightRequested === true;
    const brt = body.brt === undefined || body.brt === null ? null : body.brt;
    const emotion = body.emotion === undefined || body.emotion === null ? null : body.emotion;
    if (brt !== null && !isRecord(brt)) throw new Error('brt must be an object or null');
    if (emotion !== null && !isRecord(emotion)) throw new Error('emotion must be an object or null');

    const embeddingText = buildEchoEmbeddingText(content);
    const authedDb = createAuthedClient(auth.accessToken);
    const { data: rpcData, error: rpcError } = await authedDb.rpc(
      'create_echo_entry_with_container',
      {
        p_content: content,
        p_title: title,
        p_goal_id: goalId,
        p_ai_insight_requested: aiInsightRequested,
        p_brt: brt,
        p_emotion: emotion,
        p_embedding_text: embeddingText,
      },
    );
    if (rpcError) throw rpcError;
    const entryId = rpcData as string;

    const [{ data: entry, error: entryError }, { data: link, error: linkError }] = await Promise.all([
      authedDb.from('echo_entries').select('*').eq('id', entryId).single(),
      authedDb
        .from('echo_entry_links')
        .select('container_type, goal_id, folder_id')
        .eq('echo_entry_id', entryId)
        .eq('confirmed', true)
        .single(),
    ]);
    if (entryError || !entry) throw entryError ?? new Error('Created entry could not be read');
    if (linkError || !link) throw linkError ?? new Error('Created entry link could not be read');

    const linkRow = link as {
      container_type: 'goal' | 'folder';
      goal_id: string | null;
      folder_id: string | null;
    };
    let container: ConfirmedContainer;
    if (linkRow.container_type === 'goal' && linkRow.goal_id) {
      const { data: goal } = await authedDb
        .from('goals')
        .select('title')
        .eq('id', linkRow.goal_id)
        .single();
      container = {
        type: 'goal',
        goalId: linkRow.goal_id,
        goalTitle: (goal as { title: string } | null)?.title,
      };
    } else if (linkRow.container_type === 'folder' && linkRow.folder_id) {
      const { data: folder } = await authedDb
        .from('echo_folders')
        .select('name')
        .eq('id', linkRow.folder_id)
        .single();
      container = {
        type: 'folder',
        folderId: linkRow.folder_id,
        folderName: (folder as { name: string } | null)?.name,
      };
    } else {
      throw new Error('Created entry has an invalid confirmed container');
    }

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

    return Response.json({ entry: { ...entry, goals: null }, container }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create entry';
    const status = /not found/i.test(message) ? 404 : /must|required|invalid|exceeds|characters/i.test(message) ? 400 : 500;
    console.error('[entries] POST failed', { userId: auth.userId, error: message });
    return Response.json({ error: message }, { status });
  }
}
