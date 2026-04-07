import supabase, { createAuthedClient, isDatabaseConfigured } from '@/lib/db/client';
import {
  getVaultItemByIdForUser,
  updateVaultItem,
  deleteVaultItem,
} from '@/lib/db/vaults';
import type { VaultItem } from '@/types/vault';

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

function sanitizeOptionalString(input: unknown, maxLength: number): string | null {
  if (input === undefined || input === null) return null;
  if (typeof input !== 'string') throw new Error('Expected string');
  const cleaned = input
    .replace(/\0/g, '')
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  const trimmed = cleaned.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > maxLength) throw new Error(`Value exceeds ${maxLength} character limit`);
  return trimmed;
}

function sanitizeMetadata(input: unknown): VaultItem['metadata'] {
  if (input === undefined || input === null) return {};
  if (typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('metadata must be a plain object');
  }
  const obj = input as Record<string, unknown>;
  for (const [key, val] of Object.entries(obj)) {
    if (typeof val === 'function') {
      throw new Error(`metadata.${key} must not be a function`);
    }
  }
  return obj as VaultItem['metadata'];
}

const MAX_ID_LENGTH = 255;
const MAX_TITLE_LENGTH = 200;
const MAX_CONTENT_LENGTH = 10000;

// ─── PUT /api/vaults/items/:itemId ────────────────────────────────────────────

interface UpdateVaultItemBody {
  title?: unknown;
  content?: unknown;
  metadata?: unknown;
}

export async function PUT(
  request: Request,
  { params }: { params: { itemId: string } },
): Promise<Response> {
  if (!isDatabaseConfigured) {
    return Response.json({ error: 'Database not configured' }, { status: 503 });
  }

  const auth = await getAuthContextFromRequest(request);
  if (!auth) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let itemId: string;
  try {
    itemId = sanitizeString(params.itemId, MAX_ID_LENGTH);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid request';
    return Response.json({ error: message }, { status: 400 });
  }

  let body: UpdateVaultItemBody;
  try {
    body = (await request.json()) as UpdateVaultItemBody;
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const updates: Partial<VaultItem> = {};

  try {
    if (body.title !== undefined) {
      const sanitized = sanitizeOptionalString(body.title, MAX_TITLE_LENGTH);
      updates.title = sanitized;
    }
    if (body.content !== undefined) {
      updates.content = sanitizeOptionalString(body.content, MAX_CONTENT_LENGTH);
    }
    if (body.metadata !== undefined) {
      updates.metadata = sanitizeMetadata(body.metadata);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid request';
    return Response.json({ error: message }, { status: 400 });
  }

  try {
    const authedDb = createAuthedClient(auth.accessToken);
    const existingItem = await getVaultItemByIdForUser(itemId, auth.userId, authedDb);
    if (!existingItem) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    const item = await updateVaultItem(itemId, updates, authedDb);
    return Response.json({ item });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    console.error('[vault-items] PUT failed', { itemId, error: message });
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── DELETE /api/vaults/items/:itemId ────────────────────────────────────────

export async function DELETE(
  request: Request,
  { params }: { params: { itemId: string } },
): Promise<Response> {
  if (!isDatabaseConfigured) {
    return Response.json({ error: 'Database not configured' }, { status: 503 });
  }

  const auth = await getAuthContextFromRequest(request);
  if (!auth) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let itemId: string;
  try {
    itemId = sanitizeString(params.itemId, MAX_ID_LENGTH);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid request';
    return Response.json({ error: message }, { status: 400 });
  }

  try {
    const authedDb = createAuthedClient(auth.accessToken);
    const existingItem = await getVaultItemByIdForUser(itemId, auth.userId, authedDb);
    if (!existingItem) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    await deleteVaultItem(itemId, authedDb);
    return Response.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    console.error('[vault-items] DELETE failed', { itemId, error: message });
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
