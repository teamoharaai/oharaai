import { createAuthedClient, isDatabaseConfigured } from '@/lib/db/client';
import { withAuth, type AuthContext } from '@/lib/api/auth';
import { getOrCreateVaultForUser } from '@/lib/db/vaults';
import {
  getFoldersForVault,
  createFolder,
  countFoldersForVault,
  MAX_FOLDERS_PER_VAULT,
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

// ─── GET /api/vaults/:goalId/folders ──────────────────────────────────────────

export async function GET(request: Request, params: Record<string, string>): Promise<Response> {
  if (!isDatabaseConfigured) {
    return Response.json({ error: 'Database not configured' }, { status: 503 });
  }
  return withAuth(handleGet)(request, params);
}

async function handleGet(
  _request: Request,
  params: Record<string, string>,
  auth: AuthContext,
): Promise<Response> {
  let goalId: string;
  try {
    goalId = sanitizeString(params.goalId, MAX_ID_LENGTH);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid request';
    return Response.json({ error: message }, { status: 400 });
  }

  try {
    const authedDb = createAuthedClient(auth.accessToken);
    const vault = await getOrCreateVaultForUser(goalId, auth.userId, authedDb);
    if (!vault) return Response.json({ error: 'Not found' }, { status: 404 });

    const folders = await getFoldersForVault(vault.id, authedDb);
    return Response.json({ folders });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    console.error('[note-folders] GET failed', { goalId, error: message });
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── POST /api/vaults/:goalId/folders ─────────────────────────────────────────

interface CreateFolderBody {
  name?: unknown;
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
    goalId = sanitizeString(params.goalId, MAX_ID_LENGTH);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid request';
    return Response.json({ error: message }, { status: 400 });
  }

  let body: CreateFolderBody;
  try {
    body = (await request.json()) as CreateFolderBody;
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
    const authedDb = createAuthedClient(auth.accessToken);
    const vault = await getOrCreateVaultForUser(goalId, auth.userId, authedDb);
    if (!vault) return Response.json({ error: 'Not found' }, { status: 404 });

    // Moderate guardrail: cap folders per goal.
    const existing = await countFoldersForVault(vault.id, authedDb);
    if (existing >= MAX_FOLDERS_PER_VAULT) {
      return Response.json(
        { error: `A goal can have at most ${MAX_FOLDERS_PER_VAULT} folders.` },
        { status: 409 },
      );
    }

    try {
      const folder = await createFolder(vault.id, auth.userId, name, authedDb);
      return Response.json({ folder }, { status: 201 });
    } catch (error) {
      // Unique (vault_id, lower(name)) violation (migration 065) → duplicate name.
      if ((error as { code?: string })?.code === '23505') {
        return Response.json({ error: 'A folder with that name already exists.' }, { status: 409 });
      }
      throw error;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    console.error('[note-folders] POST failed', { goalId, error: message });
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
