import { getAuthContext } from '@/lib/api/auth';
import { createAuthedClient } from '@/lib/db/client';
import type { ApiResponse } from '@/lib/api/contracts';

interface ProfileData {
  display_name: string;
  timezone: string;
}

interface PatchBody {
  display_name?: unknown;
  timezone?: unknown;
}

export async function GET(request: Request): Promise<Response> {
  const auth = await getAuthContext(request);
  if (!auth) {
    const body: ApiResponse<never> = {
      ok: false,
      data: null,
      error: { code: 'UNAUTHORIZED', message: 'Unauthorized' },
    };
    return Response.json(body, { status: 401 });
  }

  const db = createAuthedClient(auth.accessToken);
  const { data, error } = await db
    .from('profiles')
    .select('display_name, timezone')
    .eq('id', auth.userId)
    .single();

  if (error || !data) {
    const body: ApiResponse<never> = {
      ok: false,
      data: null,
      error: { code: 'NOT_FOUND', message: 'Profile not found' },
    };
    return Response.json(body, { status: 404 });
  }

  const body: ApiResponse<ProfileData> = {
    ok: true,
    data: { display_name: data.display_name ?? '', timezone: data.timezone ?? 'UTC' },
    error: null,
  };
  return Response.json(body, { status: 200 });
}

export async function PATCH(request: Request): Promise<Response> {
  const auth = await getAuthContext(request);
  if (!auth) {
    const body: ApiResponse<never> = {
      ok: false,
      data: null,
      error: { code: 'UNAUTHORIZED', message: 'Unauthorized' },
    };
    return Response.json(body, { status: 401 });
  }

  let payload: PatchBody;
  try {
    payload = (await request.json()) as PatchBody;
  } catch {
    const body: ApiResponse<never> = {
      ok: false,
      data: null,
      error: { code: 'INVALID_INPUT', message: 'Invalid JSON body' },
    };
    return Response.json(body, { status: 400 });
  }

  const updates: Partial<{ display_name: string; timezone: string }> = {};

  if (payload.display_name !== undefined) {
    if (typeof payload.display_name !== 'string' || payload.display_name.trim() === '') {
      const body: ApiResponse<never> = {
        ok: false,
        data: null,
        error: { code: 'INVALID_INPUT', message: 'display_name must be a non-empty string' },
      };
      return Response.json(body, { status: 400 });
    }
    updates.display_name = payload.display_name.trim();
  }

  if (payload.timezone !== undefined) {
    if (typeof payload.timezone !== 'string' || payload.timezone.trim() === '') {
      const body: ApiResponse<never> = {
        ok: false,
        data: null,
        error: { code: 'INVALID_INPUT', message: 'timezone must be a non-empty string' },
      };
      return Response.json(body, { status: 400 });
    }
    updates.timezone = payload.timezone.trim();
  }

  if (Object.keys(updates).length === 0) {
    const body: ApiResponse<never> = {
      ok: false,
      data: null,
      error: { code: 'INVALID_INPUT', message: 'No valid fields to update' },
    };
    return Response.json(body, { status: 400 });
  }

  const db = createAuthedClient(auth.accessToken);
  const { data, error } = await db
    .from('profiles')
    .update(updates)
    .eq('id', auth.userId)
    .select('display_name, timezone')
    .single();

  if (error || !data) {
    const body: ApiResponse<never> = {
      ok: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update profile' },
    };
    return Response.json(body, { status: 500 });
  }

  const body: ApiResponse<ProfileData> = {
    ok: true,
    data: { display_name: data.display_name ?? '', timezone: data.timezone ?? 'UTC' },
    error: null,
  };
  return Response.json(body, { status: 200 });
}
