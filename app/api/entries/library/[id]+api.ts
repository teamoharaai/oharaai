import { withAuth, type AuthContext } from '@/lib/api/auth';
import { createAuthedClient, isDatabaseConfigured } from '@/lib/db/client';
import { deleteEntry, getEntry, updateEntry } from '@/lib/db/entries';
import { isUuid, parseEntryDraft } from '@/features/entries/validation';

function validId(params: Record<string, string>): string | null {
  return typeof params.id === 'string' && isUuid(params.id) ? params.id : null;
}

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
  const entryId = validId(params);
  if (!entryId) return Response.json({ error: 'Invalid entry ID' }, { status: 400 });
  try {
    const entry = await getEntry(createAuthedClient(auth.accessToken), auth.userId, entryId);
    return entry
      ? Response.json({ entry })
      : Response.json({ error: 'Not found' }, { status: 404 });
  } catch {
    return Response.json({ error: 'Could not load entry' }, { status: 500 });
  }
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
  const entryId = validId(params);
  if (!entryId) return Response.json({ error: 'Invalid entry ID' }, { status: 400 });
  try {
    const draft = parseEntryDraft(await request.json());
    const entry = await updateEntry(
      createAuthedClient(auth.accessToken),
      auth.userId,
      entryId,
      draft,
    );
    return entry
      ? Response.json({ entry })
      : Response.json({ error: 'Not found' }, { status: 404 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not update entry';
    const invalid = /must|required|invalid|exceeds|too many/i.test(message);
    return Response.json(
      { error: invalid ? message : 'Could not update entry' },
      { status: invalid ? 400 : 500 },
    );
  }
}

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
  const entryId = validId(params);
  if (!entryId) return Response.json({ error: 'Invalid entry ID' }, { status: 400 });
  try {
    const deleted = await deleteEntry(createAuthedClient(auth.accessToken), auth.userId, entryId);
    return deleted
      ? Response.json({ success: true })
      : Response.json({ error: 'Not found' }, { status: 404 });
  } catch {
    return Response.json({ error: 'Could not delete entry' }, { status: 500 });
  }
}
