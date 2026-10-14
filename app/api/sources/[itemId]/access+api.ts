import { withAuth, type AuthContext } from '@/lib/api/auth';
import { createAuthedClient, isDatabaseConfigured } from '@/lib/db/client';
import { getAuthorizedVaultItemById } from '@/lib/db/vaults';
import { SOURCE_BUCKET } from '@/features/sources/source-domain';

export async function GET(request: Request, params: Record<string, string>): Promise<Response> {
  if (!isDatabaseConfigured) return Response.json({ error: 'Database not configured' }, { status: 503 });
  return withAuth(handleGet)(request, params);
}

async function handleGet(_request: Request, params: Record<string, string>, auth: AuthContext): Promise<Response> {
  const itemId = params.itemId?.trim();
  if (!itemId || itemId.length > 255) return Response.json({ error: 'Invalid Source ID' }, { status: 400 });
  try {
    const db = createAuthedClient(auth.accessToken);
    const item = await getAuthorizedVaultItemById(itemId, db);
    if (!item || !['link', 'document', 'image'].includes(item.itemType)) {
      return Response.json({ error: 'Source not found' }, { status: 404 });
    }
    if (item.itemType === 'link') {
      const url = item.metadata?.url;
      if (!url) return Response.json({ error: 'Source is unavailable' }, { status: 404 });
      return Response.json({ url }, { headers: { 'Cache-Control': 'private, no-store' } });
    }
    const storagePath = item.metadata?.storagePath;
    if (!storagePath) return Response.json({ error: 'Source file is unavailable' }, { status: 404 });
    const { data, error } = await db.storage.from(SOURCE_BUCKET).createSignedUrl(storagePath, 5 * 60);
    if (error || !data?.signedUrl) return Response.json({ error: 'Source file is temporarily unavailable' }, { status: 503 });
    return Response.json({ url: data.signedUrl }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('[sources/access] GET failed', { itemId, error: error instanceof Error ? error.message : 'unknown' });
    return Response.json({ error: 'Source could not be opened' }, { status: 500 });
  }
}
