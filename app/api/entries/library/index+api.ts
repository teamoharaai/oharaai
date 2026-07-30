import { withAuth, type AuthContext } from '@/lib/api/auth';
import { createAuthedClient, isDatabaseConfigured } from '@/lib/db/client';
import { createEntry, getEntries } from '@/lib/db/entries';
import { parseEntryDraft, parseEntryType } from '@/features/entries/validation';

export async function GET(request: Request): Promise<Response> {
  if (!isDatabaseConfigured) {
    return Response.json({ error: 'Database not configured' }, { status: 503 });
  }
  return withAuth(handleGet)(request);
}

async function handleGet(
  request: Request,
  _params: Record<string, string>,
  auth: AuthContext,
): Promise<Response> {
  try {
    const type = parseEntryType(new URL(request.url).searchParams.get('type'));
    const entries = await getEntries(createAuthedClient(auth.accessToken), auth.userId, type);
    return Response.json({ entries });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not load entries';
    const status = message === 'Invalid entry type' ? 400 : 500;
    return Response.json(
      { error: status === 400 ? message : 'Could not load entries' },
      { status },
    );
  }
}

export async function POST(request: Request): Promise<Response> {
  if (!isDatabaseConfigured) {
    return Response.json({ error: 'Database not configured' }, { status: 503 });
  }
  return withAuth(handlePost)(request);
}

async function handlePost(
  request: Request,
  _params: Record<string, string>,
  auth: AuthContext,
): Promise<Response> {
  try {
    const draft = parseEntryDraft(await request.json());
    const entry = await createEntry(createAuthedClient(auth.accessToken), auth.userId, draft);
    return Response.json({ entry }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not create entry';
    const invalid = /must|required|invalid|exceeds|too many/i.test(message);
    return Response.json(
      { error: invalid ? message : 'Could not create entry' },
      { status: invalid ? 400 : 500 },
    );
  }
}
