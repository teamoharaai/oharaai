import { withAuth, type AuthContext } from '@/lib/api/auth';
import {
  iosError,
  iosJSON,
  iosRequestContext,
  logIosRouteFailure,
  type IosRequestContext,
} from '@/lib/api/ios-contract';
import { createAuthedClient, isDatabaseConfigured } from '@/lib/db/client';
import { createEntry, getEntries } from '@/lib/db/entries';
import { parseEntryDraft, parseEntryType } from '@/features/entries/validation';

export async function GET(request: Request): Promise<Response> {
  const context = iosRequestContext(request);
  if (!isDatabaseConfigured) {
    return iosError(context, 503, 'SERVICE_UNAVAILABLE', 'Service unavailable');
  }
  return withAuth(
    (innerRequest, params, auth) => handleGet(innerRequest, params, auth, context),
    { onUnauthorized: () => iosError(context, 401, 'UNAUTHORIZED', 'Unauthorized') },
  )(request);
}

async function handleGet(
  request: Request,
  _params: Record<string, string>,
  auth: AuthContext,
  context: IosRequestContext,
): Promise<Response> {
  try {
    const type = parseEntryType(new URL(request.url).searchParams.get('type'));
    const entries = await getEntries(createAuthedClient(auth.accessToken), auth.userId, type);
    return iosJSON(context, { entries });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not load entries';
    const status = message === 'Invalid entry type' ? 400 : 500;
    if (status === 500) logIosRouteFailure('entries_read_failed', context, status, error);
    return iosError(
      context,
      status,
      status === 400 ? 'INVALID_INPUT' : 'INTERNAL_ERROR',
      status === 400 ? message : 'Could not load entries',
    );
  }
}

export async function POST(request: Request): Promise<Response> {
  const context = iosRequestContext(request);
  if (!isDatabaseConfigured) {
    return iosError(context, 503, 'SERVICE_UNAVAILABLE', 'Service unavailable');
  }
  return withAuth(
    (innerRequest, params, auth) => handlePost(innerRequest, params, auth, context),
    { onUnauthorized: () => iosError(context, 401, 'UNAUTHORIZED', 'Unauthorized') },
  )(request);
}

async function handlePost(
  request: Request,
  _params: Record<string, string>,
  auth: AuthContext,
  context: IosRequestContext,
): Promise<Response> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return iosError(context, 400, 'INVALID_INPUT', 'Invalid JSON body');
  }

  let draft: ReturnType<typeof parseEntryDraft>;
  try {
    draft = parseEntryDraft(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid entry';
    return iosError(context, 422, 'UNPROCESSABLE', message);
  }

  try {
    const entry = await createEntry(createAuthedClient(auth.accessToken), auth.userId, draft);
    return iosJSON(context, { entry }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Client request ID belongs to another entry type') {
      return iosError(context, 409, 'CONFLICT', 'Entry request conflicts with an existing entry');
    }
    logIosRouteFailure('entry_create_failed', context, 500, error);
    return iosError(context, 500, 'INTERNAL_ERROR', 'Could not create entry');
  }
}
