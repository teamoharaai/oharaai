/**
 * useCirclesStore — PROTOTYPE local state for Circles.
 *
 * Everything here is in-memory fixture state: public-goal choice, invitations,
 * posting, encouraging, commenting and saving never leave the client. Swap for
 * services once the social schema is decided (L3).
 */
import { create } from 'zustand';
import {
  ACCEPTED_SHARED_GOALS,
  INITIAL_POSTS,
  PENDING_GOAL_INVITES,
  PEOPLE,
} from './fixtures';
import type {
  CirclePerson,
  CirclesPost,
  FeedFilter,
  FeedScope,
  GoalInvite,
  LinkableItem,
  SharedGoal,
} from './types';

export interface SentInvite {
  goalId: string;
  goalTitle: string;
  inviteeIds: string[];
}

interface CirclesStore {
  people: CirclePerson[];
  posts: CirclesPost[];
  filter: FeedFilter;
  scope: FeedScope;
  /** Goals friends invited me to that I accepted ("Shared with You"). */
  sharedWithMe: SharedGoal[];
  /** Invitations waiting in Requests. */
  goalInvites: GoalInvite[];
  /** My one optional public Goal. */
  myPublicGoalId: string | null;
  /** Invitations I sent (pending until the invitee accepts). */
  sentInvites: SentInvite[];
  setFilter: (filter: FeedFilter) => void;
  setScope: (scope: FeedScope) => void;
  toggleFollowing: (personId: string) => void;
  toggleEncourage: (postId: string) => void;
  toggleSave: (postId: string) => void;
  addComment: (postId: string, body: string) => void;
  publishPost: (input: { body: string; withImage: boolean; link: LinkableItem | null }) => void;
  acceptInvite: (inviteId: string) => void;
  declineInvite: (inviteId: string) => void;
  setMyPublicGoal: (goalId: string | null) => void;
  sendInvite: (invite: SentInvite) => void;
  withdrawInvite: (goalId: string) => void;
}

let localId = 0;
const nextId = (prefix: string) => `${prefix}-local-${++localId}`;

function updatePost(
  posts: CirclesPost[],
  postId: string,
  update: (post: CirclesPost) => CirclesPost,
): CirclesPost[] {
  return posts.map((post) => (post.id === postId ? update(post) : post));
}

export const useCirclesStore = create<CirclesStore>((set) => ({
  people: PEOPLE,
  posts: INITIAL_POSTS,
  filter: 'all',
  scope: { kind: 'everyone' },
  sharedWithMe: ACCEPTED_SHARED_GOALS,
  goalInvites: PENDING_GOAL_INVITES,
  myPublicGoalId: null,
  sentInvites: [],
  setFilter: (filter) => set({ filter }),
  setScope: (scope) => set({ scope }),
  toggleFollowing: (personId) => set((state) => ({
    people: state.people.map((person) => (
      person.id === personId ? { ...person, following: !person.following } : person
    )),
  })),
  toggleEncourage: (postId) => set((state) => ({
    posts: updatePost(state.posts, postId, (post) => ({
      ...post,
      encouragedByMe: !post.encouragedByMe,
      encouragements: post.encouragements + (post.encouragedByMe ? -1 : 1),
    })),
  })),
  toggleSave: (postId) => set((state) => ({
    posts: updatePost(state.posts, postId, (post) => ({ ...post, savedByMe: !post.savedByMe })),
  })),
  addComment: (postId, body) => set((state) => ({
    posts: updatePost(state.posts, postId, (post) => ({
      ...post,
      comments: [
        ...post.comments,
        { id: nextId('c'), authorId: 'me', body, createdLabel: 'Just now' },
      ],
    })),
  })),
  publishPost: ({ body, withImage, link }) => set((state) => ({
    filter: 'all',
    scope: { kind: 'everyone' },
    posts: [
      {
        id: nextId('p'),
        authorId: 'me',
        kind: link?.kind === 'milestone' ? 'milestone' : 'reflection',
        createdLabel: 'Just now',
        body,
        image: withImage
          ? { tone: link && link.kind !== 'reflection' ? link.category : 'growth', caption: 'Image placeholder' }
          : null,
        attachment: link,
        encouragements: 0,
        encouragedByMe: false,
        savedByMe: false,
        comments: [],
      },
      ...state.posts,
    ],
  })),
  acceptInvite: (inviteId) => set((state) => {
    const invite = state.goalInvites.find((item) => item.id === inviteId);
    if (!invite) return {};
    return {
      goalInvites: state.goalInvites.filter((item) => item.id !== inviteId),
      sharedWithMe: [invite.goal, ...state.sharedWithMe],
    };
  }),
  declineInvite: (inviteId) => set((state) => ({
    goalInvites: state.goalInvites.filter((item) => item.id !== inviteId),
  })),
  setMyPublicGoal: (goalId) => set({ myPublicGoalId: goalId }),
  sendInvite: (invite) => set((state) => ({
    sentInvites: [invite, ...state.sentInvites.filter((item) => item.goalId !== invite.goalId)],
  })),
  withdrawInvite: (goalId) => set((state) => ({
    sentInvites: state.sentInvites.filter((item) => item.goalId !== goalId),
  })),
}));

export function selectVisiblePosts(
  posts: CirclesPost[],
  filter: FeedFilter,
  scope: FeedScope,
): CirclesPost[] {
  return posts.filter((post) => {
    if (filter === 'reflections' && post.kind !== 'reflection') return false;
    if (filter === 'milestones' && post.kind !== 'milestone') return false;
    if (filter === 'completed' && post.kind !== 'goal_complete') return false;
    if (scope.kind === 'person') return post.authorId === scope.personId;
    if (scope.kind === 'goal') {
      const attachment = post.attachment;
      if (!attachment) return false;
      return attachment.id === scope.goalId;
    }
    return true;
  });
}
