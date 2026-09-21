import { createAuthedClient, isDatabaseConfigured } from '@/lib/db/client';
import { withAuth, type AuthContext } from '@/lib/api/auth';
import { getOrCreateVaultForUser } from '@/lib/db/vaults';
import {
  getFolderByIdForVault,
  renameFolder,
  deleteFolder,
  MAX_FOLDER_NAME_LENGTH,
} from '@/lib/db/vault-folders';

// ─── Input sanitization ───────────────────────────────────────────────────────

const MAX_ID_LENGTH = 255;

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

// Resolves the caller's vault for the goal and confirms the folder belongs to
// it. Returns the vault id, or a Response to short-circuit with an error.
async function resolveFolder(
  params: Record<string, string>,
  auth: AuthContext,
): Promise<{ vaultId: string } | Response> {
  let goalId: string;
  let folderId: string;
  try {
    goalId = sanitizeString(params.goalId, MAX_ID_LENGTH);
    folderId = sanitizeString(params.folderId, MAX_ID_LENGTH);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid request';
    return Response.json({ error: message }, { status: 400 });
  }

  const authedDb = createAuthedClient(auth.accessToken);
  const vault = await getOrCreateVaultForUser(goalId, auth.userId, authedDb);
  if (!vault) return Response.json({ error: 'Not found' }, { status: 404 });

  const folder = await getFolderByIdForVault(folderId, vault.id, authedDb);
  if (!folder) return Response.json({ error: 'Not found' }, { status: 404 });

  return { vaultId: vault.id };
}

// ─── PATCH /api/vaults/:goalId/folders/:folderId ──────────────────────────────
// Body: { name }

interface RenameFolderBody {
  name?: unknown;
}

export async function PATCH(request: Request, params: Record<string, string>): Promise<Response> {
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
  let body: RenameFolderBody;
  try {
    body = (await request.json()) as RenameFolderBody;
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  let name: string;
  try {
    name = sanitizeString(body.name, MAX_FOLDER_NAME_LENGTH);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid request';
    return Response.json({ error: message }, { status: 400 });
  }

  try {
    const resolved = await resolveFolder(params, auth);
    if (resolved instanceof Response) return resolved;

    const authedDb = createAuthedClient(auth.accessToken);
    try {
      const folder = await renameFolder(params.folderId, name, authedDb);
      return Response.json({ folder });
    } catch (error) {
      if ((error as { code?: string })?.code === '23505') {
        return Response.json({ error: 'A folder with that name already exists.' }, { status: 409 });
      }
      throw error;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    console.error('[note-folders] PATCH failed', { folderId: params.folderId, error: message });
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── DELETE /api/vaults/:goalId/folders/:folderId ─────────────────────────────
// The folder's notes fall back to General (folder_id -> NULL) via the FK's
// ON DELETE SET NULL (migration 065). Notes are never destroyed.

export async function DELETE(request: Request, params: Record<string, string>): Promise<Response> {
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
  try {
    const resolved = await resolveFolder(params, auth);
    if (resolved instanceof Response) return resolved;

    const authedDb = createAuthedClient(auth.accessToken);
    await deleteFolder(params.folderId, authedDb);
    return Response.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    console.error('[note-folders] DELETE failed', { folderId: params.folderId, error: message });
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
