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
  username: string;
  bio: string | null;
  avatar_url: string | null;
  interests_user: string[];
  timezone: string;
  intelligence_enabled: boolean;
  username_changes_remaining: number;
  username_change_next_available_at: string | null;
}

interface PatchBody {
  display_name?: unknown;
  username?: unknown;
  bio?: unknown;
  avatar_url?: unknown;
  interests_user?: unknown;
  timezone?: unknown;
  intelligence_enabled?: unknown;
}

interface UsernameChangeStatus {
  remaining: number;
  nextAvailableAt: string | null;
}

const PROFILE_SELECT =
  'display_name, username, bio, avatar_url, interests_user, timezone, intelligence_enabled';
const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
const USERNAME_CHANGE_LIMIT = 3;
const USERNAME_CHANGE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function toProfileData(
  data: Record<string, unknown>,
  usernameStatus: UsernameChangeStatus,
): ProfileData {
  return {
    display_name: (data.display_name as string) ?? '',
    username: (data.username as string) ?? '',
    bio: (data.bio as string | null) ?? null,
    avatar_url: (data.avatar_url as string | null) ?? null,
    interests_user: (data.interests_user as string[] | null) ?? [],
    timezone: (data.timezone as string) ?? 'UTC',
    intelligence_enabled: (data.intelligence_enabled as boolean) ?? true,
    username_changes_remaining: usernameStatus.remaining,
    username_change_next_available_at: usernameStatus.nextAvailableAt,
  };
}

async function getUsernameChangeStatus(
  db: ReturnType<typeof createAuthedClient>,
  userId: string,
): Promise<UsernameChangeStatus> {
  const { data, error } = await db
    .from('username_change_limits')
    .select('change_timestamps')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[profile] Failed to load username change status:', error.message);
    return { remaining: USERNAME_CHANGE_LIMIT, nextAvailableAt: null };
  }

  const cutoff = Date.now() - USERNAME_CHANGE_WINDOW_MS;
  const recentChanges = Array.isArray(data?.change_timestamps)
    ? data.change_timestamps
        .map((value) => new Date(value).getTime())
        .filter((value) => Number.isFinite(value) && value > cutoff)
        .sort((left, right) => left - right)
    : [];

  return {
    remaining: Math.max(0, USERNAME_CHANGE_LIMIT - recentChanges.length),
    nextAvailableAt:
      recentChanges.length >= USERNAME_CHANGE_LIMIT
        ? new Date(recentChanges[0] + USERNAME_CHANGE_WINDOW_MS).toISOString()
        : null,
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

  const usernameStatus = await getUsernameChangeStatus(db, auth.userId);
  const body: ApiResponse<ProfileData> = {
    ok: true,
    data: toProfileData(data, usernameStatus),
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
    username: string;
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

  if (payload.username !== undefined) {
    if (typeof payload.username !== 'string') {
      const body: ApiResponse<never> = {
        ok: false,
        data: null,
        error: { code: 'INVALID_INPUT', message: 'username must be a string' },
      };
      return Response.json(body, { status: 400 });
    }

    const username = payload.username.trim().toLowerCase();
    if (!USERNAME_RE.test(username)) {
      const body: ApiResponse<never> = {
        ok: false,
        data: null,
        error: {
          code: 'INVALID_INPUT',
          message: 'Username must be 3–20 lowercase letters, numbers, or underscores.',
        },
      };
      return Response.json(body, { status: 400 });
    }
    updates.username = username;
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
    if (error?.code === '23505') {
      const body: ApiResponse<never> = {
        ok: false,
        data: null,
        error: { code: 'CONFLICT', message: 'That username is already taken.' },
      };
      return Response.json(body, { status: 409 });
    }

    if (error?.message.includes('USERNAME_CHANGE_LIMIT_REACHED')) {
      const usernameStatus = await getUsernameChangeStatus(db, auth.userId);
      const body: ApiResponse<never> = {
        ok: false,
        data: null,
        error: {
          code: 'RATE_LIMITED',
          message: 'You can change your username up to 3 times in any 7-day period.',
          details: {
            username_changes_remaining: usernameStatus.remaining,
            username_change_next_available_at: usernameStatus.nextAvailableAt,
          },
        },
      };
      return Response.json(body, { status: 429 });
    }

    console.error('[profile] Failed to update profile:', error?.message ?? 'No profile returned');
    const body: ApiResponse<never> = {
      ok: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update profile' },
    };
    return Response.json(body, { status: 500 });
  }

  const usernameStatus = await getUsernameChangeStatus(db, auth.userId);
  const body: ApiResponse<ProfileData> = {
    ok: true,
    data: toProfileData(data, usernameStatus),
    error: null,
  };
  return Response.json(body, { status: 200 });
}
