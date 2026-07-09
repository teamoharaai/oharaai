import { createAuthedClient, isDatabaseConfigured } from '@/lib/db/client';
import { withAuth, type AuthContext } from '@/lib/api/auth';
import { getFoldersForUser, createFolderForUser } from '@/lib/db/echo-folders';

// ─── Input sanitization ───────────────────────────────────────────────────────

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

// ─── GET /api/folders ─────────────────────────────────────────────────────────

export async function GET(request: Request): Promise<Response> {
  if (!isDatabaseConfigured) {
    return Response.json({ error: 'Database not configured' }, { status: 503 });
  }
  return withAuth(handleGet)(request);
}

async function handleGet(_request: Request, _params: Record<string, string>, auth: AuthContext): Promise<Response> {
  try {
    const authedDb = createAuthedClient(auth.accessToken);
    const folders = await getFoldersForUser(auth.userId, authedDb);
    return Response.json({ folders });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    console.error('[folders] GET failed', { error: message });
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── POST /api/folders ────────────────────────────────────────────────────────

interface CreateFolderBody {
  name?: unknown;
  is_general?: unknown;
}

export async function POST(request: Request): Promise<Response> {
  if (!isDatabaseConfigured) {
    return Response.json({ error: 'Database not configured' }, { status: 503 });
  }
  return withAuth(handlePost)(request);
}

async function handlePost(request: Request, _params: Record<string, string>, auth: AuthContext): Promise<Response> {
  let body: CreateFolderBody;
  try {
    body = (await request.json()) as CreateFolderBody;
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // is_general is server-controlled only (get_or_create_general_folder is the
  // sole path to a General folder) — never client-settable.
  if (body.is_general !== undefined) {
    return Response.json({ error: 'is_general cannot be set by the client' }, { status: 400 });
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
    const folder = await createFolderForUser(auth.userId, name, authedDb);
    return Response.json({ folder }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    console.error('[folders] POST failed', { error: message });
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
