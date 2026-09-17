/**
 * Circles feature types.
 *
 * The domain shapes are the server DTOs mapped in `lib/db/circles-core.ts`
 * (camelCase, stable). We re-export them (type-only) so components import from
 * the feature's own type surface while the single source of truth stays in the
 * data layer. Only view-state types (feed filter/scope) are defined here.
 *
 * Privacy model (enforced server-side, CD-002/CD-004):
 * - Goals, notes and reflections are private by default.
 * - A user may make at most ONE Goal public; every friend can view it.
 * - Any other Goal is visible only to friends explicitly invited to it.
 * - Feed posts may link a Goal, milestone or reflection, carrying only a
 *   server-snapshotted title + an author-written description — never progress,
 *   Tasks or content.
 */
export type {
  CirclesAuthor,
  CircleLinkKind,
  CircleFeedLink,
  CirclesPostCore,
  CirclesFeedPost,
  SavedPost,
  PostComment,
  GoalAccess,
  CircleGoalSummary,
  IncomingGoalInvite,
  SentInviteStatus,
  SentGoalInvite,
  PublicGoalRef,
  LinkableItem,
  LinkableItems,
} from '@/lib/db/circles-core';

/** Server post_kind values (migration 053). */
export type PostKind = 'reflection' | 'milestone' | 'goal_complete';

export type FeedFilter = 'all' | 'reflections' | 'milestones' | 'completed';

export type FeedScope =
  | { kind: 'everyone' }
  | { kind: 'person'; personId: string }
  | { kind: 'goal'; goalId: string };
