import { createAuthedClient, isDatabaseConfigured } from '@/lib/db/client';
import { withAuth, type AuthContext } from '@/lib/api/auth';
import { getOrCreateVaultForUser } from '@/lib/db/vaults';
import {
  getFolderByIdForVault,
  moveNotesToFolder,
  MAX_BULK_MOVE_NOTES,
} from '@/lib/db/vault-folders';

const MAX_ID_LENGTH = 255;

function sanitizeId(input: unknown): string {
  if (typeof input !== 'string') throw new Error('Expected string id');
  const trimmed = input.replace(/\0/g, '').trim();
  if (trimmed.length === 0) throw new Error('Empty id');
  if (trimmed.length > MAX_ID_LENGTH) throw new Error('Id too long');
  return trimmed;
}

// ─── POST /api/vaults/:goalId/notes/move ──────────────────────────────────────
// Body: { noteIds: string[], folderId: string | null }
// Moves the given note items to a folder (or General when folderId is null).

interface MoveBody {
  noteIds?: unknown;
  folderId?: unknown;
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

  let body: MoveBody;
  try {
    body = (await request.json()) as MoveBody;
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  let noteIds: string[];
  let folderId: string | null;
  try {
    if (!Array.isArray(body.noteIds) || body.noteIds.length === 0) {
      throw new Error('noteIds must be a non-empty array');
    }
    if (body.noteIds.length > MAX_BULK_MOVE_NOTES) {
      throw new Error(`Cannot move more than ${MAX_BULK_MOVE_NOTES} notes at once`);
    }
    noteIds = Array.from(new Set(body.noteIds.map(sanitizeId)));
    folderId = body.folderId === null || body.folderId === undefined ? null : sanitizeId(body.folderId);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid request';
    return Response.json({ error: message }, { status: 400 });
  }

  try {
    const authedDb = createAuthedClient(auth.accessToken);
    const vault = await getOrCreateVaultForUser(goalId, auth.userId, authedDb);
    if (!vault) return Response.json({ error: 'Not found' }, { status: 404 });

    // A non-General target must be a folder in this goal's own vault.
    if (folderId !== null) {
      const folder = await getFolderByIdForVault(folderId, vault.id, authedDb);
      if (!folder) return Response.json({ error: 'Folder not found' }, { status: 404 });
    }

    const moved = await moveNotesToFolder(vault.id, noteIds, folderId, authedDb);
    return Response.json({ moved });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    console.error('[note-folders] move failed', { goalId, error: message });
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
