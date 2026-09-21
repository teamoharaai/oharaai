import { createAuthedClient, isDatabaseConfigured } from '@/lib/db/client';
import { withAuth, type AuthContext } from '@/lib/api/auth';
import { getOrCreateVaultForUser } from '@/lib/db/vaults';
import { reorderFolders, MAX_FOLDERS_PER_VAULT } from '@/lib/db/vault-folders';

const MAX_ID_LENGTH = 255;

function sanitizeId(input: unknown): string {
  if (typeof input !== 'string') throw new Error('Expected string id');
  const trimmed = input.replace(/\0/g, '').trim();
  if (trimmed.length === 0) throw new Error('Empty id');
  if (trimmed.length > MAX_ID_LENGTH) throw new Error('Id too long');
  return trimmed;
}

// ─── POST /api/vaults/:goalId/reorder-folders ─────────────────────────────────
// Body: { folderIds: string[] } — the desired order; each folder's sort_order is
// set to its index. Lives outside the /folders/ subtree so it never collides
// with the [folderId] dynamic route.

interface ReorderBody {
  folderIds?: unknown;
}

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
  let goalId: string;
  try {
    goalId = sanitizeId(params.goalId);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid request';
    return Response.json({ error: message }, { status: 400 });
  }

  let body: ReorderBody;
  try {
    body = (await request.json()) as ReorderBody;
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  let folderIds: string[];
  try {
    if (!Array.isArray(body.folderIds) || body.folderIds.length === 0) {
      throw new Error('folderIds must be a non-empty array');
    }
    if (body.folderIds.length > MAX_FOLDERS_PER_VAULT) {
      throw new Error(`Cannot order more than ${MAX_FOLDERS_PER_VAULT} folders`);
    }
    folderIds = Array.from(new Set(body.folderIds.map(sanitizeId)));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid request';
    return Response.json({ error: message }, { status: 400 });
  }

  try {
    const authedDb = createAuthedClient(auth.accessToken);
    const vault = await getOrCreateVaultForUser(goalId, auth.userId, authedDb);
    if (!vault) return Response.json({ error: 'Not found' }, { status: 404 });

    await reorderFolders(vault.id, folderIds, authedDb);
    return Response.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    console.error('[note-folders] reorder failed', { goalId, error: message });
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
