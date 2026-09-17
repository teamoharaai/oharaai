/**
 * Circles server-layer core: pure mappers, validators, and the typed error the
 * data-access layer throws. No runtime imports (only `import type`), so this
 * module is reachable from the node test runner, which strips types and has no
 * `@/` import map (tracker-metrics D-004). Keep it side-effect free.
 */
import type { Database } from '@/types/supabase';

// ---------------------------------------------------------------------------
// Domain error
// ---------------------------------------------------------------------------

export type CircleDomainErrorCode =
  | 'INVALID_INPUT'
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'CONFLICT';

export class CircleDataError extends Error {
  readonly code: CircleDomainErrorCode;

  constructor(code: CircleDomainErrorCode, message: string) {
    super(message);
    this.name = 'CircleDataError';
    this.code = code;
  }
}

export interface PgErrorLike {
  code?: string;
  message?: string;
}

// Migration 053 raises the same SQLSTATEs the friends RPCs use. Map only the
// stable codes; anything else is an unexpected failure and is rethrown raw so
// the route layer turns it into a 500 without leaking DB prose.
export function classifyPgError(
  error: PgErrorLike | null | undefined,
): CircleDomainErrorCode | null {
  switch (error?.code) {
    case '42501':
      return 'FORBIDDEN';
    case 'P0002':
      return 'NOT_FOUND';
    case '22023':
      return 'INVALID_INPUT';
    case '23505':
      return 'CONFLICT';
    default:
      return null;
  }
}

// Translate a Supabase/Postgres error into a typed CircleDataError, or rethrow
// the original error when the SQLSTATE isn't one we deliberately surface.
export function throwCircleError(
  error: PgErrorLike,
  fallbackMessage: string,
): never {
  const code = classifyPgError(error);
  if (code) {
    throw new CircleDataError(code, error.message || fallbackMessage);
  }
  throw error;
}

// ---------------------------------------------------------------------------
// DTOs (camelCase; never leak snake_case Row shapes past this boundary)
// ---------------------------------------------------------------------------

export interface CirclesAuthor {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

export type CircleLinkKind = 'goal' | 'milestone' | 'reflection';

export interface CircleFeedLink {
  kind: CircleLinkKind;
  refId: string;
  title: string;
  description: string | null;
  category: string | null;
}

export interface CirclesPostCore {
  id: string;
  authorId: string;
  postKind: string;
  body: string;
  imagePath: string | null;
  link: CircleFeedLink | null;
  createdAt: string;
  author: CirclesAuthor | null;
}

export interface CirclesFeedPost extends CirclesPostCore {
  encouragementCount: number;
  commentCount: number;
  encouragedByMe: boolean;
  savedByMe: boolean;
}

export interface SavedPost {
  savedAt: string;
  post: CirclesPostCore;
}

export interface PostComment {
  id: string;
  postId: string;
  authorId: string;
  body: string;
  createdAt: string;
  author: CirclesAuthor | null;
}

export type GoalAccess = 'owner' | 'public' | 'invited';

export interface CircleGoalSummary {
  id: string;
  ownerId: string;
  title: string;
  category: string;
  status: string;
  access: GoalAccess;
  milestones: { title: string; done: boolean }[];
  weeklyTask: { done: number; target: number } | null;
  owner: CirclesAuthor | null;
}

export interface IncomingGoalInvite {
  inviteId: string;
  createdAt: string;
  goal: CircleGoalSummary;
}

// CD-014: the owner never sees an explicit decline — declined maps to pending.
export type SentInviteStatus = 'pending' | 'accepted' | 'withdrawn';

export interface SentGoalInvite {
  id: string;
  goalId: string;
  status: SentInviteStatus;
  createdAt: string;
  respondedAt: string | null;
  invitee: CirclesAuthor | null;
}

export interface PublicGoalRef {
  id: string;
  title: string;
  category: string;
  status: string;
}

export type LinkableItem =
  | { kind: 'goal'; id: string; title: string; category: string; description: string }
  | { kind: 'milestone'; id: string; title: string; category: string; goalTitle: string }
  | { kind: 'reflection'; id: string; title: string; description: string };

export interface LinkableItems {
  goals: Extract<LinkableItem, { kind: 'goal' }>[];
  milestones: Extract<LinkableItem, { kind: 'milestone' }>[];
  reflections: Extract<LinkableItem, { kind: 'reflection' }>[];
}

// ---------------------------------------------------------------------------
// Row aliases from generated types (type-only; stripped in tests)
// ---------------------------------------------------------------------------

type Tables = Database['public']['Tables'];
type Functions = Database['public']['Functions'];

export type ProfileRow = Functions['get_profiles_by_ids']['Returns'][number];
export type FeedRow = Functions['get_circles_feed']['Returns'][number];
export type CirclePostRow = Tables['circle_posts']['Row'];
export type GoalInviteRow = Tables['goal_share_invites']['Row'];

// ---------------------------------------------------------------------------
// Mappers (pure)
// ---------------------------------------------------------------------------

export function mapAuthor(row: ProfileRow): CirclesAuthor {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name ?? '',
    avatarUrl: row.avatar_url ?? null,
  };
}

export function buildAuthorMap(
  rows: ProfileRow[],
): Map<string, CirclesAuthor> {
  return new Map(rows.map((row) => [row.id, mapAuthor(row)] as const));
}

function buildFeedLink(
  kind: string | null,
  refId: string | null,
  title: string | null,
  description: string | null,
  category: string | null,
): CircleFeedLink | null {
  if (!kind || !refId || !title) return null;
  return {
    kind: kind as CircleLinkKind,
    refId,
    title,
    description: description ?? null,
    category: category ?? null,
  };
}

export function mapFeedRow(
  row: FeedRow,
  authorsById: Map<string, CirclesAuthor>,
): CirclesFeedPost {
  return {
    id: row.id,
    authorId: row.author_id,
    postKind: row.post_kind,
    body: row.body,
    imagePath: row.image_path ?? null,
    link: buildFeedLink(
      row.link_kind,
      row.link_ref_id,
      row.link_title,
      row.link_description,
      row.link_category,
    ),
    createdAt: row.created_at,
    author: authorsById.get(row.author_id) ?? null,
    encouragementCount: Number(row.encouragement_count ?? 0),
    commentCount: Number(row.comment_count ?? 0),
    encouragedByMe: Boolean(row.encouraged_by_me),
    savedByMe: Boolean(row.saved_by_me),
  };
}

export function mapPostCore(
  row: CirclePostRow,
  authorsById: Map<string, CirclesAuthor>,
): CirclesPostCore {
  return {
    id: row.id,
    authorId: row.author_id,
    postKind: row.post_kind,
    body: row.body,
    imagePath: row.image_path ?? null,
    link: buildFeedLink(
      row.link_kind,
      row.link_ref_id,
      row.link_title,
      row.link_description,
      row.link_category,
    ),
    createdAt: row.created_at,
    author: authorsById.get(row.author_id) ?? null,
  };
}

// circles_goal_summary jsonb → whitelisted summary (CD-004). `owner` is attached
// separately by the caller after profile hydration.
export function mapGoalSummary(
  json: unknown,
  authorsById?: Map<string, CirclesAuthor>,
): CircleGoalSummary | null {
  if (!json || typeof json !== 'object') return null;
  const j = json as Record<string, unknown>;
  const ownerId = String(j.owner_id ?? '');
  const weekly = j.weekly_task as
    | { done?: unknown; target?: unknown }
    | null
    | undefined;
  const milestones = Array.isArray(j.milestones) ? j.milestones : [];

  return {
    id: String(j.id ?? ''),
    ownerId,
    title: String(j.title ?? ''),
    category: String(j.category ?? ''),
    status: String(j.status ?? ''),
    access: (j.access as GoalAccess) ?? 'invited',
    milestones: milestones.map((m) => {
      const entry = (m ?? {}) as { title?: unknown; done?: unknown };
      return { title: String(entry.title ?? ''), done: Boolean(entry.done) };
    }),
    weeklyTask: weekly
      ? { done: Number(weekly.done ?? 0), target: Number(weekly.target ?? 0) }
      : null,
    owner: authorsById?.get(ownerId) ?? null,
  };
}

// CD-014: fold `declined` into `pending` and drop `withdrawn` from the owner's
// sent list. Returns null for statuses that should not be surfaced.
export function mapSentInvite(
  row: GoalInviteRow,
  authorsById: Map<string, CirclesAuthor>,
): SentGoalInvite | null {
  let status: SentInviteStatus;
  switch (row.status) {
    case 'pending':
    case 'declined':
      status = 'pending';
      break;
    case 'accepted':
      status = 'accepted';
      break;
    default:
      // 'withdrawn' (or anything unexpected) is not part of the sent list.
      return null;
  }
  return {
    id: row.id,
    goalId: row.goal_id,
    status,
    createdAt: row.created_at,
    respondedAt: row.responded_at ?? null,
    invitee: authorsById.get(row.invitee_id) ?? null,
  };
}

// ---------------------------------------------------------------------------
// Validators (first line of defence; the RPCs re-check server-side)
// ---------------------------------------------------------------------------

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validateUuid(value: unknown, fieldName: string): string {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!UUID_PATTERN.test(normalized)) {
    throw new CircleDataError(
      'INVALID_INPUT',
      `${fieldName} must be a valid UUID.`,
    );
  }
  return normalized;
}

function validateBoundedText(
  value: unknown,
  fieldName: string,
  min: number,
  max: number,
): string {
  const text = typeof value === 'string' ? value.trim() : '';
  if (text.length < min || text.length > max) {
    throw new CircleDataError(
      'INVALID_INPUT',
      `${fieldName} must be ${min} to ${max} characters.`,
    );
  }
  return text;
}

export function validatePostBody(value: unknown): string {
  return validateBoundedText(value, 'body', 1, 2000);
}

export function validateCommentBody(value: unknown): string {
  return validateBoundedText(value, 'body', 1, 1000);
}

export interface CreatePostInput {
  body: string;
  imagePath: string | null;
  linkKind: CircleLinkKind | null;
  linkRefId: string | null;
  linkDescription: string | null;
}

const LINK_KINDS: readonly CircleLinkKind[] = ['goal', 'milestone', 'reflection'];

export function parseCreatePostInput(
  body: Record<string, unknown>,
): CreatePostInput {
  const postBody = validatePostBody(body.body);

  const rawKind = body.link_kind;
  const rawRef = body.link_ref_id;
  const hasKind = rawKind != null && rawKind !== '';
  const hasRef = rawRef != null && rawRef !== '';
  if (hasKind !== hasRef) {
    throw new CircleDataError(
      'INVALID_INPUT',
      'link_kind and link_ref_id must be provided together.',
    );
  }

  let linkKind: CircleLinkKind | null = null;
  let linkRefId: string | null = null;
  if (hasKind) {
    if (!LINK_KINDS.includes(rawKind as CircleLinkKind)) {
      throw new CircleDataError('INVALID_INPUT', 'Unsupported link_kind.');
    }
    linkKind = rawKind as CircleLinkKind;
    linkRefId = validateUuid(rawRef, 'link_ref_id');
  }

  let linkDescription: string | null = null;
  if (body.link_description != null && body.link_description !== '') {
    linkDescription = validateBoundedText(
      body.link_description,
      'link_description',
      1,
      280,
    );
  }

  const imagePath =
    typeof body.image_path === 'string' && body.image_path.trim() !== ''
      ? body.image_path.trim()
      : null;

  return { body: postBody, imagePath, linkKind, linkRefId, linkDescription };
}

export function parseInviteeIds(value: unknown): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new CircleDataError(
      'INVALID_INPUT',
      'invitee_ids must be a non-empty array.',
    );
  }
  if (value.length > 50) {
    throw new CircleDataError(
      'INVALID_INPUT',
      'invitee_ids may contain at most 50 entries.',
    );
  }
  const ids = value.map((id) => validateUuid(id, 'invitee_id'));
  return Array.from(new Set(ids));
}

export function validateInviteResponse(
  value: unknown,
): 'accepted' | 'declined' {
  if (value === 'accepted' || value === 'declined') return value;
  throw new CircleDataError(
    'INVALID_INPUT',
    "response must be 'accepted' or 'declined'.",
  );
}

// PUT /public-goal accepts a goal id or an explicit null (make private).
export function parsePublicGoalId(value: unknown): string | null {
  if (value === null) return null;
  return validateUuid(value, 'goal_id');
}
