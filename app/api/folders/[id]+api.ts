import supabase, { createAuthedClient, isDatabaseConfigured } from '@/lib/db/client';
import {
  getFolderByIdForUser,
  renameFolder,
  getOrCreateGeneralFolderId,
  deleteFolderReassign,
  deleteFolderWithContents,
} from '@/lib/db/echo-folders';

// ─── Auth ─────────────────────────────────────────────────────────────────────

async function getAuthContextFromRequest(request: Request) {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token || !isDatabaseConfigured) return null;

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  return error || !user ? null : { userId: user.id, accessToken: token };
}

// ─── Input sanitization ───────────────────────────────────────────────────────

const MAX_ID_LENGTH = 255;
const MAX_NAME_LENGTH = 100;

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

const DELETE_MODES = ['delete_contents', 'folder_only'] as const;
type DeleteMode = (typeof DELETE_MODES)[number];

// ─── PATCH /api/folders/:id ───────────────────────────────────────────────────
// Body: { name }

interface RenameFolderBody {
  name?: unknown;
}

export async function PATCH(
  request: Request,
  params: Record<string, string>,
): Promise<Response> {
  if (!isDatabaseConfigured) {
    return Response.json({ error: 'Database not configured' }, { status: 503 });
  }

  const auth = await getAuthContextFromRequest(request);
  if (!auth) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let folderId: string;
  try {
    folderId = sanitizeString(params.id, MAX_ID_LENGTH);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid request';
    return Response.json({ error: message }, { status: 400 });
  }

  let body: RenameFolderBody;
  try {
    body = (await request.json()) as RenameFolderBody;
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  let name: string;
  try {
    name = sanitizeString(body.name, MAX_NAME_LENGTH);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid request';
    return Response.json({ error: message }, { status: 400 });
  }

  try {
    const authedDb = createAuthedClient(auth.accessToken);

    const folder = await getFolderByIdForUser(folderId, auth.userId, authedDb);
    if (!folder) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }
    if (folder.isGeneral) {
      return Response.json({ error: 'The General folder cannot be renamed' }, { status: 403 });
    }

    const updated = await renameFolder(folderId, name, authedDb);
    return Response.json({ folder: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    console.error('[folders] PATCH failed', { folderId, error: message });
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── DELETE /api/folders/:id ──────────────────────────────────────────────────
// Body: { mode: 'delete_contents' | 'folder_only' }

interface DeleteFolderBody {
  mode?: unknown;
}

export async function DELETE(
  request: Request,
  params: Record<string, string>,
): Promise<Response> {
  if (!isDatabaseConfigured) {
    return Response.json({ error: 'Database not configured' }, { status: 503 });
  }

  const auth = await getAuthContextFromRequest(request);
  if (!auth) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let folderId: string;
  try {
    folderId = sanitizeString(params.id, MAX_ID_LENGTH);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid request';
    return Response.json({ error: message }, { status: 400 });
  }

  let body: DeleteFolderBody;
  try {
    body = (await request.json()) as DeleteFolderBody;
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!(DELETE_MODES as readonly unknown[]).includes(body.mode)) {
    return Response.json(
      { error: `mode must be one of: ${DELETE_MODES.join(', ')}` },
      { status: 400 },
    );
  }
  const mode = body.mode as DeleteMode;

  try {
    const authedDb = createAuthedClient(auth.accessToken);

    const folder = await getFolderByIdForUser(folderId, auth.userId, authedDb);
    if (!folder) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }
    if (folder.isGeneral) {
      return Response.json({ error: 'The General folder cannot be deleted' }, { status: 403 });
    }

    if (mode === 'folder_only') {
      const generalFolderId = await getOrCreateGeneralFolderId(auth.userId);
      await deleteFolderReassign(folderId, generalFolderId, authedDb);
    } else {
      await deleteFolderWithContents(folderId, authedDb);
    }

    return Response.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    console.error('[folders] DELETE failed', { folderId, mode, error: message });
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
