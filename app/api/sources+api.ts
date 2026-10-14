import { withAuth, type AuthContext } from '@/lib/api/auth';
import { createAuthedClient, isDatabaseConfigured } from '@/lib/db/client';
import { createVaultItem, getOrCreatePersonalSourceVaultForUser, mapVaultItem } from '@/lib/db/vaults';
import { sanitizeSourceId, sanitizeSourceMetadata } from '@/features/sources/source-server';
import type { VaultItem } from '@/types/vault';

export async function POST(request: Request): Promise<Response> {
  if (!isDatabaseConfigured) return Response.json({ error: 'Database not configured' }, { status: 503 });
  return withAuth(handlePost)(request);
}

async function handlePost(request: Request, _params: Record<string, string>, auth: AuthContext): Promise<Response> {
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; }
  catch { return Response.json({ error: 'Invalid JSON body' }, { status: 400 }); }
  try {
    const itemType = body.itemType;
    if (itemType !== 'link' && itemType !== 'document' && itemType !== 'image') {
      return Response.json({ error: 'Unsupported Source type' }, { status: 400 });
    }
    const sourceId = sanitizeSourceId(body.sourceId);
    const metadata = sanitizeSourceMetadata(body.metadata, { itemType, sourceId, userId: auth.userId });
    const title = typeof body.title === 'string' ? body.title.replace(/\0/g, '').trim().slice(0, 200) : '';
    if (!title) return Response.json({ error: 'Source title is required' }, { status: 400 });
    const content = typeof body.content === 'string' ? body.content.replace(/\0/g, '').trim().slice(0, 2000) || null : null;
    const db = createAuthedClient(auth.accessToken);
    if (sourceId) {
      const { data: existing, error: existingError } = await db.from('vault_items')
        .select('id, vault_id, item_type, content_kind, title, content, metadata, folder_id, visibility, created_by, sort_order, created_at, updated_at')
        .eq('id', sourceId).eq('created_by', auth.userId).maybeSingle();
      if (existingError) throw existingError;
      if (existing) return Response.json({ item: mapVaultItem(existing as never) });
    }
    const vault = await getOrCreatePersonalSourceVaultForUser(auth.userId, db);
    const item = await createVaultItem(vault.id, {
      id: sourceId,
      vaultId: vault.id,
      itemType,
      contentKind: 'generic',
      title,
      content,
      metadata: metadata as VaultItem['metadata'],
      folderId: null,
      visibility: 'private',
      createdBy: auth.userId,
      sortOrder: 0,
    }, db);
    return Response.json({ item }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Source could not be saved.';
    if (/invalid|required|valid web|too large|cannot be uploaded|storage path|filename|provider/i.test(message)) {
      return Response.json({ error: message }, { status: 400 });
    }
    console.error('[sources] POST failed', { error: message });
    return Response.json({ error: 'Source could not be saved.' }, { status: 500 });
  }
}
