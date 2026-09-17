/**
 * Circles prototype types.
 *
 * PROTOTYPE ONLY: these shapes back fixture data for the Circles UI and are not
 * a schema or API contract. Real sharing/feed persistence is an L3 decision.
 *
 * Privacy model represented here:
 * - Goals, notes and reflections are private by default.
 * - A user may make at most ONE Goal public; every friend can view it.
 * - Any other Goal is visible only to people explicitly invited to it. An
 *   invitation lands in the invitee's Requests and must be accepted.
 * - Feed posts may link a Goal, milestone or reflection, but a link carries
 *   only its title and description — never progress, Tasks or content.
 */
import type { GoalCreationCategory } from '@/lib/goals/schema';

export type CirclesGoalStatus = 'in_progress' | 'not_started' | 'complete';

/** How the viewer got access: the owner's one public Goal, or an accepted invite. */
export type GoalAccess = 'public' | 'invited';

export interface CirclePerson {
  id: string;
  displayName: string;
  firstName: string;
  avatarUrl: string | null;
  /** Quiet human context line, e.g. "Active today". */
  activity: string;
  hasNewPost: boolean;
  following: boolean;
  /** One-line "what they're working on", shown in the person sheet. */
  focus: string;
}

export interface SharedMilestone {
  title: string;
  done: boolean;
}

/** A friend's Goal as a viewer sees it: view only. */
export interface SharedGoal {
  id: string;
  ownerId: string;
  title: string;
  category: GoalCreationCategory;
  status: CirclesGoalStatus;
  access: GoalAccess;
  why: string;
  /** Titles only. Progress = completed / total (see progress.ts). */
  milestones: SharedMilestone[];
  /** This week's Task count, shown beside milestone progress. */
  weeklyTask?: { label: string; done: number; target: number };
}

export interface GoalInvite {
  id: string;
  sentLabel: string;
  goal: SharedGoal;
}

export interface MyGoal {
  id: string;
  title: string;
  category: GoalCreationCategory;
  description: string;
  milestones: SharedMilestone[];
}

export interface MyReflection {
  id: string;
  title: string;
  description: string;
}

/** What a post can link. Only title + description ever leave the owner. */
export type LinkableItem =
  | { kind: 'goal'; id: string; title: string; category: GoalCreationCategory; description: string }
  | { kind: 'milestone'; id: string; title: string; category: GoalCreationCategory; goalTitle: string }
  | { kind: 'reflection'; id: string; title: string; description: string };

export type PostAttachment =
  | LinkableItem
  | { kind: 'goal_complete'; id: string; goalTitle: string; category: GoalCreationCategory; reflection: string; completedLabel: string };

export type PostKind = 'reflection' | 'milestone' | 'goal_complete';

export interface PostComment {
  id: string;
  authorId: string;
  body: string;
  createdLabel: string;
}

export interface CirclesPost {
  id: string;
  authorId: string;
  kind: PostKind;
  createdLabel: string;
  body: string;
  /** Placeholder visual seed; no real upload in the prototype. */
  image: { tone: GoalCreationCategory; caption: string } | null;
  attachment: PostAttachment | null;
  /** Public: every viewer of the post sees the count. */
  encouragements: number;
  encouragedByMe: boolean;
  savedByMe: boolean;
  comments: PostComment[];
}

export type FeedFilter = 'all' | 'reflections' | 'milestones' | 'completed';

export type FeedScope =
  | { kind: 'everyone' }
  | { kind: 'person'; personId: string }
  | { kind: 'goal'; goalId: string };
