import { withAuth, type AuthContext } from '@/lib/api/auth';
import { createAuthedClient } from '@/lib/db/client';
import type { ApiResponse } from '@/lib/api/contracts';

function unauthorizedResponse(): Response {
  const body: ApiResponse<never> = {
    ok: false,
    data: null,
    error: { code: 'UNAUTHORIZED', message: 'Unauthorized' },
  };
  return Response.json(body, { status: 401 });
}

interface ProfileData {
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  interests_user: string[];
  timezone: string;
  intelligence_enabled: boolean;
}

interface PatchBody {
  display_name?: unknown;
  bio?: unknown;
  avatar_url?: unknown;
  interests_user?: unknown;
  timezone?: unknown;
  intelligence_enabled?: unknown;
}

const PROFILE_SELECT = 'display_name, bio, avatar_url, interests_user, timezone, intelligence_enabled';

function toProfileData(data: Record<string, unknown>): ProfileData {
  return {
    display_name: (data.display_name as string) ?? '',
    bio: (data.bio as string | null) ?? null,
    avatar_url: (data.avatar_url as string | null) ?? null,
    interests_user: (data.interests_user as string[] | null) ?? [],
    timezone: (data.timezone as string) ?? 'UTC',
    intelligence_enabled: (data.intelligence_enabled as boolean) ?? true,
  };
}

export async function GET(request: Request): Promise<Response> {
  return withAuth(handleGet, { onUnauthorized: unauthorizedResponse })(request);
}

async function handleGet(_request: Request, _params: Record<string, string>, auth: AuthContext): Promise<Response> {
  const db = createAuthedClient(auth.accessToken);
  const { data, error } = await db
    .from('profiles')
    .select(PROFILE_SELECT)
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
    data: toProfileData(data),
    error: null,
  };
  return Response.json(body, { status: 200 });
}

export async function PATCH(request: Request): Promise<Response> {
  return withAuth(handlePatch, { onUnauthorized: unauthorizedResponse })(request);
}

async function handlePatch(request: Request, _params: Record<string, string>, auth: AuthContext): Promise<Response> {
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

  // Only fields explicitly assigned below are ever written. Anything else on
  // the payload (interests_ai, character_profile, context, onboarding_complete,
  // id, created_at, updated_at, last_summarized_at, or unknown keys) is
  // silently ignored rather than errored on.
  const updates: Partial<{
    display_name: string;
    bio: string;
    avatar_url: string;
    interests_user: unknown[];
    timezone: string;
    intelligence_enabled: boolean;
  }> = {};

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

  if (payload.bio !== undefined) {
    if (typeof payload.bio !== 'string') {
      const body: ApiResponse<never> = {
        ok: false,
        data: null,
        error: { code: 'INVALID_INPUT', message: 'bio must be a string' },
      };
      return Response.json(body, { status: 400 });
    }
    updates.bio = payload.bio;
  }

  if (payload.avatar_url !== undefined) {
    if (typeof payload.avatar_url !== 'string' || payload.avatar_url.trim() === '') {
      const body: ApiResponse<never> = {
        ok: false,
        data: null,
        error: { code: 'INVALID_INPUT', message: 'avatar_url must be a non-empty string' },
      };
      return Response.json(body, { status: 400 });
    }
    updates.avatar_url = payload.avatar_url.trim();
  }

  if (payload.interests_user !== undefined) {
    if (!Array.isArray(payload.interests_user)) {
      const body: ApiResponse<never> = {
        ok: false,
        data: null,
        error: { code: 'INVALID_INPUT', message: 'interests_user must be an array' },
      };
      return Response.json(body, { status: 400 });
    }
    updates.interests_user = payload.interests_user;
  }

  if (payload.intelligence_enabled !== undefined) {
    if (typeof payload.intelligence_enabled !== 'boolean') {
      const body: ApiResponse<never> = {
        ok: false,
        data: null,
        error: { code: 'INVALID_INPUT', message: 'intelligence_enabled must be a boolean' },
      };
      return Response.json(body, { status: 400 });
    }
    updates.intelligence_enabled = payload.intelligence_enabled;
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
    .select(PROFILE_SELECT)
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
    data: toProfileData(data),
    error: null,
  };
  return Response.json(body, { status: 200 });
}
