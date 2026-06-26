import supabase, { createAuthedClient, isDatabaseConfigured } from '@/lib/db/client';
import {
  getVaultByGoalIdForUser,
  getVaultItems,
  createVaultItem,
} from '@/lib/db/vaults';
import type { VaultItem, VaultItemType } from '@/types/vault';

const VAULT_ITEM_TYPES: readonly VaultItemType[] = [
  'note',
  'link',
  'document',
  'insight',
  'action_update',
];

const MAX_ID_LENGTH = 255;
const MAX_TITLE_LENGTH = 200;
const MAX_CONTENT_LENGTH = 10000;

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
  // Validate known keys only; reject functions or nested class instances implicitly
  // by checking that the value is serializable (no function values).
  const obj = input as Record<string, unknown>;
  for (const [key, val] of Object.entries(obj)) {
    if (typeof val === 'function') {
      throw new Error(`metadata.${key} must not be a function`);
    }
  }
  return obj as VaultItem['metadata'];
}

// ─── GET /api/vaults/:goalId ──────────────────────────────────────────────────

export async function GET(
  request: Request,
  { params }: { params: { goalId: string } },
): Promise<Response> {
  if (!isDatabaseConfigured) {
    return Response.json({ error: 'Database not configured' }, { status: 503 });
  }

  const auth = await getAuthContextFromRequest(request);
  if (!auth) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let goalId: string;
  try {
    goalId = sanitizeString(params.goalId, MAX_ID_LENGTH);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid request';
    return Response.json({ error: message }, { status: 400 });
  }

  try {
    const authedDb = createAuthedClient(auth.accessToken);
    const vault = await getVaultByGoalIdForUser(goalId, auth.userId, authedDb);
    if (!vault) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }
    const items = await getVaultItems(vault.id, authedDb);
    return Response.json({ vault, items });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    console.error('[vaults] GET failed', { goalId, error: message });
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── POST /api/vaults/:goalId ─────────────────────────────────────────────────

interface CreateVaultItemBody {
  itemType?: unknown;
  title?: unknown;
  content?: unknown;
  metadata?: unknown;
}

export async function POST(
  request: Request,
  { params }: { params: { goalId: string } },
): Promise<Response> {
  if (!isDatabaseConfigured) {
    return Response.json({ error: 'Database not configured' }, { status: 503 });
  }

  const auth = await getAuthContextFromRequest(request);
  if (!auth) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let goalId: string;
  try {
    goalId = sanitizeString(params.goalId, MAX_ID_LENGTH);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid request';
    return Response.json({ error: message }, { status: 400 });
  }

  let body: CreateVaultItemBody;
  try {
    body = (await request.json()) as CreateVaultItemBody;
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  let itemType: VaultItemType;
  let title: string | null;
  let content: string | null;
  let metadata: VaultItem['metadata'];

  try {
    if (!(VAULT_ITEM_TYPES as readonly unknown[]).includes(body.itemType)) {
      throw new Error(`itemType must be one of: ${VAULT_ITEM_TYPES.join(', ')}`);
    }
    itemType = body.itemType as VaultItemType;
    title = sanitizeOptionalString(body.title, MAX_TITLE_LENGTH);
    content = sanitizeOptionalString(body.content, MAX_CONTENT_LENGTH);
    metadata = sanitizeMetadata(body.metadata);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid request';
    return Response.json({ error: message }, { status: 400 });
  }

  try {
    const authedDb = createAuthedClient(auth.accessToken);
    const vault = await getVaultByGoalIdForUser(goalId, auth.userId, authedDb);
    if (!vault) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    const item = await createVaultItem(vault.id, {
      vaultId: vault.id,
      itemType,
      title,
      content,
      metadata,
      visibility: 'private',
      createdBy: auth.userId,
      sortOrder: 0,
    }, authedDb);

    return Response.json({ item }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    console.error('[vaults] POST failed', { goalId, error: message });
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
