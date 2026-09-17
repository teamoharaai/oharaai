/**
 * useCirclesStore — Circles client state backed by the real `/api/circles/**`
 * endpoints (Phase 4). Mutations use optimistic update + revert
 * (components/CLAUDE.md); initial state is fetched via `ensureLoaded`, guarded so
 * repeated mounts (Home feed + avatar-menu panes) trigger a single load.
 *
 * Loading is only ever kicked off by callers gated on `FEATURES.CIRCLES_ENABLED`
 * (the hooks); with the flag off nothing here fetches.
 */
import { create } from 'zustand';
import {
  createComment,
  createPost,
  deleteComment,
  encouragePost,
  fetchComments,
  fetchFeed,
  fetchFriendsPublicGoals,
  fetchIncomingInvites,
  fetchInviteableFriends,
  fetchLinkable,
  fetchPublicGoal,
  fetchSaved,
  fetchSentInvites,
  fetchSharedWithMe,
  respondToInvite,
  savePost,
  sendInvites,
  setPublicGoal,
  unencouragePost,
  unsavePost,
  withdrawInvite,
} from './services/circles-service';
import type {
  CircleGoalSummary,
  CirclesAuthor,
  CirclesFeedPost,
  FeedFilter,
  FeedScope,
  IncomingGoalInvite,
  LinkableItem,
  LinkableItems,
  PostComment,
  PublicGoalRef,
  SavedPost,
  SentGoalInvite,
} from './types';

type LoadStatus = 'idle' | 'loading' | 'loaded';

const EMPTY_LINKABLE: LinkableItems = { goals: [], milestones: [], reflections: [] };

interface CirclesStore {
  status: LoadStatus;
  me: CirclesAuthor | null;
  posts: CirclesFeedPost[];
  commentsByPost: Record<string, PostComment[]>;
  filter: FeedFilter;
  scope: FeedScope;
  sharedWithMe: CircleGoalSummary[];
  friendsPublicGoals: CircleGoalSummary[];
  goalInvites: IncomingGoalInvite[];
  sentInvites: SentGoalInvite[];
  myPublicGoal: PublicGoalRef | null;
  linkable: LinkableItems;
  friends: CirclesAuthor[];
  saved: SavedPost[];
  savedLoaded: boolean;

  setMe: (me: CirclesAuthor | null) => void;
  ensureLoaded: () => Promise<void>;
  setFilter: (filter: FeedFilter) => void;
  setScope: (scope: FeedScope) => void;

  toggleEncourage: (postId: string) => Promise<void>;
  toggleSave: (postId: string) => Promise<void>;
  loadComments: (postId: string) => Promise<void>;
  addComment: (postId: string, body: string) => Promise<void>;
  removeComment: (postId: string, commentId: string) => Promise<void>;
  publishPost: (input: { body: string; link: LinkableItem | null; linkDescription: string | null }) => Promise<void>;

  acceptInvite: (inviteId: string) => Promise<void>;
  declineInvite: (inviteId: string) => Promise<void>;
  setMyPublicGoal: (goalId: string | null) => Promise<void>;
  sendInviteToGoal: (goalId: string, invitees: CirclesAuthor[]) => Promise<void>;
  withdrawInvitesForGoal: (goalId: string) => Promise<void>;
  loadSaved: () => Promise<void>;
}

function updatePost(
  posts: CirclesFeedPost[],
  postId: string,
  update: (post: CirclesFeedPost) => CirclesFeedPost,
): CirclesFeedPost[] {
  return posts.map((post) => (post.id === postId ? update(post) : post));
}

export const useCirclesStore = create<CirclesStore>((set, get) => ({
  status: 'idle',
  me: null,
  posts: [],
  commentsByPost: {},
  filter: 'all',
  scope: { kind: 'everyone' },
  sharedWithMe: [],
  friendsPublicGoals: [],
  goalInvites: [],
  sentInvites: [],
  myPublicGoal: null,
  linkable: EMPTY_LINKABLE,
  friends: [],
  saved: [],
  savedLoaded: false,

  setMe: (me) => set({ me }),

  ensureLoaded: async () => {
    if (get().status !== 'idle') return;
    set({ status: 'loading' });
    const [feed, shared, friendsPublic, invites, sent, publicGoal, linkable, friends] =
      await Promise.allSettled([
        fetchFeed(),
        fetchSharedWithMe(),
        fetchFriendsPublicGoals(),
        fetchIncomingInvites(),
        fetchSentInvites(),
        fetchPublicGoal(),
        fetchLinkable(),
        fetchInviteableFriends(),
      ]);
    set((state) => ({
      posts: feed.status === 'fulfilled' ? feed.value : state.posts,
      sharedWithMe: shared.status === 'fulfilled' ? shared.value : state.sharedWithMe,
      friendsPublicGoals:
        friendsPublic.status === 'fulfilled' ? friendsPublic.value : state.friendsPublicGoals,
      goalInvites: invites.status === 'fulfilled' ? invites.value : state.goalInvites,
      sentInvites: sent.status === 'fulfilled' ? sent.value : state.sentInvites,
      myPublicGoal: publicGoal.status === 'fulfilled' ? publicGoal.value : state.myPublicGoal,
      linkable: linkable.status === 'fulfilled' ? linkable.value : state.linkable,
      friends: friends.status === 'fulfilled' ? friends.value : state.friends,
      status: 'loaded',
    }));
  },

  setFilter: (filter) => set({ filter }),
  setScope: (scope) => set({ scope }),

  toggleEncourage: async (postId) => {
    const post = get().posts.find((item) => item.id === postId);
    if (!post) return;
    const wasEncouraged = post.encouragedByMe;
    const flip = (encouraged: boolean) =>
      set((state) => ({
        posts: updatePost(state.posts, postId, (item) => ({
          ...item,
          encouragedByMe: encouraged,
          encouragementCount: Math.max(0, item.encouragementCount + (encouraged ? 1 : -1)),
        })),
      }));
    flip(!wasEncouraged);
    try {
      if (wasEncouraged) await unencouragePost(postId);
      else await encouragePost(postId);
    } catch {
      flip(wasEncouraged);
    }
  },

  toggleSave: async (postId) => {
    const post = get().posts.find((item) => item.id === postId);
    const wasSaved = post ? post.savedByMe : get().saved.some((item) => item.post.id === postId);
    set((state) => ({
      posts: updatePost(state.posts, postId, (item) => ({ ...item, savedByMe: !wasSaved })),
      saved: wasSaved ? state.saved.filter((item) => item.post.id !== postId) : state.saved,
    }));
    try {
      if (wasSaved) await unsavePost(postId);
      else await savePost(postId);
      if (get().savedLoaded) {
        const saved = await fetchSaved();
        set({ saved });
      }
    } catch {
      set((state) => ({
        posts: updatePost(state.posts, postId, (item) => ({ ...item, savedByMe: wasSaved })),
      }));
      if (get().savedLoaded) {
        try {
          const saved = await fetchSaved();
          set({ saved });
        } catch {
          /* leave the reverted feed state */
        }
      }
    }
  },

  loadComments: async (postId) => {
    try {
      const comments = await fetchComments(postId);
      set((state) => ({ commentsByPost: { ...state.commentsByPost, [postId]: comments } }));
    } catch {
      /* keep whatever is cached */
    }
  },

  addComment: async (postId, body) => {
    const me = get().me;
    const tempId = `temp-comment-${Date.now()}`;
    const optimistic: PostComment = {
      id: tempId,
      postId,
      authorId: me?.id ?? '',
      body,
      createdAt: new Date().toISOString(),
      author: me,
    };
    set((state) => ({
      commentsByPost: {
        ...state.commentsByPost,
        [postId]: [...(state.commentsByPost[postId] ?? []), optimistic],
      },
      posts: updatePost(state.posts, postId, (item) => ({
        ...item,
        commentCount: item.commentCount + 1,
      })),
    }));
    try {
      const realId = await createComment(postId, body);
      set((state) => ({
        commentsByPost: {
          ...state.commentsByPost,
          [postId]: (state.commentsByPost[postId] ?? []).map((comment) =>
            comment.id === tempId ? { ...comment, id: realId } : comment,
          ),
        },
      }));
    } catch {
      set((state) => ({
        commentsByPost: {
          ...state.commentsByPost,
          [postId]: (state.commentsByPost[postId] ?? []).filter((comment) => comment.id !== tempId),
        },
        posts: updatePost(state.posts, postId, (item) => ({
          ...item,
          commentCount: Math.max(0, item.commentCount - 1),
        })),
      }));
    }
  },

  removeComment: async (postId, commentId) => {
    const prev = get().commentsByPost[postId] ?? [];
    set((state) => ({
      commentsByPost: {
        ...state.commentsByPost,
        [postId]: prev.filter((comment) => comment.id !== commentId),
      },
      posts: updatePost(state.posts, postId, (item) => ({
        ...item,
        commentCount: Math.max(0, item.commentCount - 1),
      })),
    }));
    try {
      await deleteComment(commentId);
    } catch {
      set((state) => ({
        commentsByPost: { ...state.commentsByPost, [postId]: prev },
        posts: updatePost(state.posts, postId, (item) => ({
          ...item,
          commentCount: item.commentCount + 1,
        })),
      }));
    }
  },

  publishPost: async ({ body, link, linkDescription }) => {
    const me = get().me;
    const tempId = `temp-post-${Date.now()}`;
    const optimistic: CirclesFeedPost = {
      id: tempId,
      authorId: me?.id ?? '',
      postKind: link?.kind === 'milestone' ? 'milestone' : 'reflection',
      body,
      imagePath: null,
      link: link
        ? {
            kind: link.kind,
            refId: link.id,
            title: link.title,
            description: linkDescription,
            category: link.kind === 'reflection' ? null : link.category,
          }
        : null,
      createdAt: new Date().toISOString(),
      author: me,
      encouragementCount: 0,
      commentCount: 0,
      encouragedByMe: false,
      savedByMe: false,
    };
    set((state) => ({ filter: 'all', scope: { kind: 'everyone' }, posts: [optimistic, ...state.posts] }));
    try {
      await createPost({
        body,
        ...(link ? { link_kind: link.kind, link_ref_id: link.id } : {}),
        ...(linkDescription ? { link_description: linkDescription } : {}),
      });
      const posts = await fetchFeed();
      set({ posts });
    } catch (error) {
      set((state) => ({ posts: state.posts.filter((item) => item.id !== tempId) }));
      throw error;
    }
  },

  acceptInvite: async (inviteId) => {
    const invite = get().goalInvites.find((item) => item.inviteId === inviteId);
    if (!invite) return;
    set((state) => ({
      goalInvites: state.goalInvites.filter((item) => item.inviteId !== inviteId),
      sharedWithMe: [invite.goal, ...state.sharedWithMe],
    }));
    try {
      await respondToInvite(inviteId, 'accepted');
    } catch {
      set((state) => ({
        goalInvites: [invite, ...state.goalInvites],
        sharedWithMe: state.sharedWithMe.filter((goal) => goal.id !== invite.goal.id),
      }));
    }
  },

  declineInvite: async (inviteId) => {
    const invite = get().goalInvites.find((item) => item.inviteId === inviteId);
    if (!invite) return;
    set((state) => ({ goalInvites: state.goalInvites.filter((item) => item.inviteId !== inviteId) }));
    try {
      await respondToInvite(inviteId, 'declined');
    } catch {
      set((state) => ({ goalInvites: [invite, ...state.goalInvites] }));
    }
  },

  setMyPublicGoal: async (goalId) => {
    const prev = get().myPublicGoal;
    let provisional: PublicGoalRef | null = null;
    if (goalId) {
      const goal = get().linkable.goals.find((item) => item.id === goalId);
      provisional = {
        id: goalId,
        title: goal?.title ?? '',
        category: goal?.category ?? '',
        status: 'active',
      };
    }
    set({ myPublicGoal: provisional });
    try {
      await setPublicGoal(goalId);
      const canonical = await fetchPublicGoal();
      set({ myPublicGoal: canonical });
    } catch {
      set({ myPublicGoal: prev });
    }
  },

  sendInviteToGoal: async (goalId, invitees) => {
    await sendInvites(
      goalId,
      invitees.map((person) => person.id),
    );
    const sent = await fetchSentInvites();
    set({ sentInvites: sent });
  },

  withdrawInvitesForGoal: async (goalId) => {
    const prev = get().sentInvites;
    const targets = prev.filter((invite) => invite.goalId === goalId);
    if (targets.length === 0) return;
    set((state) => ({ sentInvites: state.sentInvites.filter((invite) => invite.goalId !== goalId) }));
    try {
      await Promise.all(targets.map((invite) => withdrawInvite(invite.id)));
      const sent = await fetchSentInvites();
      set({ sentInvites: sent });
    } catch {
      set({ sentInvites: prev });
    }
  },

  loadSaved: async () => {
    try {
      const saved = await fetchSaved();
      set({ saved, savedLoaded: true });
    } catch {
      set({ savedLoaded: true });
    }
  },
}));

export function selectVisiblePosts(
  posts: CirclesFeedPost[],
  filter: FeedFilter,
  scope: FeedScope,
): CirclesFeedPost[] {
  return posts.filter((post) => {
    if (filter === 'reflections' && post.postKind !== 'reflection') return false;
    if (filter === 'milestones' && post.postKind !== 'milestone') return false;
    if (filter === 'completed' && post.postKind !== 'goal_complete') return false;
    if (scope.kind === 'person') return post.authorId === scope.personId;
    if (scope.kind === 'goal') return post.link?.refId === scope.goalId;
    return true;
  });
}
