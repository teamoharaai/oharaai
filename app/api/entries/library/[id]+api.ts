import { withAuth, type AuthContext } from '@/lib/api/auth';
import { createAuthedClient, isDatabaseConfigured } from '@/lib/db/client';
import { createServiceRoleClient } from '@/lib/db/service-client';
import { deleteEntry, getEntryDetail, updateEntry } from '@/lib/db/entries';
import { databaseErrorMessage, isEchoOwnedError, isEntryConflictError } from '@/features/entries/conflict';
import { isUuid, parseEntryDraft } from '@/features/entries/validation';

function validId(params: Record<string, string>): string | null {
  return typeof params.id === 'string' && isUuid(params.id) ? params.id : null;
}

export async function GET(request: Request, params: Record<string, string>): Promise<Response> {
  if (!isDatabaseConfigured) {
    return Response.json({ error: 'Database not configured' }, { status: 503 });
  }
  const requestId = globalThis.crypto?.randomUUID?.() ?? `entry-${Date.now()}`;
  const startedAt = Date.now();
  let authCompletedAt = startedAt;
  const response = await withAuth(async (authedRequest, authedParams, auth) => {
    authCompletedAt = Date.now();
    return handleGet(authedRequest, authedParams, auth, {
      authMs: authCompletedAt - startedAt,
      requestId,
      startedAt,
    });
  })(request, params);
  response.headers.set('X-Request-ID', requestId);
  if (!response.headers.has('Server-Timing')) {
    response.headers.set('Server-Timing', `auth;dur=${Date.now() - startedAt}, total;dur=${Date.now() - startedAt}`);
  }
  return response;
}

async function handleGet(
  _request: Request,
  params: Record<string, string>,
  auth: AuthContext,
  diagnostic: { authMs: number; requestId: string; startedAt: number },
): Promise<Response> {
  const entryId = validId(params);
  if (!entryId) return Response.json({ error: 'Invalid entry ID' }, { status: 400 });
  try {
    let metadataDb = null;
    try {
      metadataDb = createServiceRoleClient();
    } catch {
      // Author metadata is optional. Entry RLS remains the canonical read gate.
    }
    const result = await getEntryDetail(
      createAuthedClient(auth.accessToken),
      metadataDb,
      auth.userId,
      entryId,
    );
    const totalMs = Date.now() - diagnostic.startedAt;
    const serverTiming = [
      `auth;dur=${diagnostic.authMs}`,
      `entry;dur=${result.timings.entryReadMs}`,
      `membership;dur=${result.timings.membershipMs}`,
      `metadata;dur=${result.timings.authorContextMs}`,
      `total;dur=${totalMs}`,
    ].join(', ');
    console.info('[entries/detail] completed', {
      requestId: diagnostic.requestId,
      status: result.detail ? 200 : 404,
      shared: result.detail ? !result.detail.capabilities.canEdit : false,
      timings: result.timings,
      totalMs,
    });
    return result.detail
      ? Response.json(
        { ...result.detail, requestId: diagnostic.requestId },
        { headers: { 'Cache-Control': 'private, no-store', 'Server-Timing': serverTiming } },
      )
      : Response.json(
        { error: 'Not found' },
        { status: 404, headers: { 'Cache-Control': 'private, no-store', 'Server-Timing': serverTiming } },
      );
  } catch (error) {
    const totalMs = Date.now() - diagnostic.startedAt;
    console.error('[entries/detail] failed', {
      requestId: diagnostic.requestId,
      error: databaseErrorMessage(error),
      totalMs,
    });
    return Response.json(
      { error: 'Could not load entry' },
      { status: 500, headers: { 'Server-Timing': `auth;dur=${diagnostic.authMs}, total;dur=${totalMs}` } },
    );
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
    const message = databaseErrorMessage(error);
    if (isEchoOwnedError(error)) return echoOwnedResponse();
    if (isEntryConflictError(error)) {
      return Response.json({ error: message }, { status: 409 });
    }
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
  } catch (error) {
    if (isEchoOwnedError(error)) return echoOwnedResponse();
    return Response.json({ error: 'Could not delete entry.' }, { status: 500 });
  }
}

// Entries captured in Echo are changed only in Echo (TD-005 B10); the database refuses the write.
function echoOwnedResponse(): Response {
  return Response.json(
    { error: 'This Journal entry was captured in Echo. Edit or delete it in Echo.', code: 'ECHO_OWNED' },
    { status: 409 },
  );
}
