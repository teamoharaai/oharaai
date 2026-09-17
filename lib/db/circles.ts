import type { SupabaseClient } from '@supabase/supabase-js';
import supabase from './client';
import {
  buildAuthorMap,
  CircleDataError,
  mapFeedRow,
  mapGoalSummary,
  mapPostCore,
  mapSentInvite,
  throwCircleError,
  type CircleGoalSummary,
  type CirclesAuthor,
  type CirclesFeedPost,
  type CirclePostRow,
  type CreatePostInput,
  type FeedRow,
  type GoalInviteRow,
  type IncomingGoalInvite,
  type LinkableItems,
  type PostComment,
  type ProfileRow,
  type PublicGoalRef,
  type SavedPost,
  type SentGoalInvite,
} from './circles-core';

type DbClient = SupabaseClient;

const SHAREABLE_STATUSES = ['active', 'complete', 'stagnant'] as const;

// Hydrate other users' public profile fields. get_profiles_by_ids (migration
// 030) only returns self + live friend edges; every author/invitee surfaced by
// Circles is a friend or self, so this is always sufficient.
async function hydrateAuthors(
  ids: string[],
  client: DbClient,
): Promise<Map<string, CirclesAuthor>> {
  const unique = Array.from(new Set(ids)).filter(Boolean);
  if (unique.length === 0) return new Map();

  const { data, error } = await client.rpc('get_profiles_by_ids', {
    user_ids: unique,
  });
  if (error) throw error;
  return buildAuthorMap((data ?? []) as unknown as ProfileRow[]);
}

// ---------------------------------------------------------------------------
// Feed
// ---------------------------------------------------------------------------

export async function getCirclesFeed(
  options: { before?: string | null; limit?: number },
  client: DbClient = supabase,
): Promise<CirclesFeedPost[]> {
  const { data, error } = await client.rpc('get_circles_feed', {
    p_before: options.before ?? undefined,
    p_limit: options.limit ?? undefined,
  });
  if (error) throw error;

  const rows = (data ?? []) as unknown as FeedRow[];
  const authors = await hydrateAuthors(
    rows.map((row) => row.author_id),
    client,
  );
  return rows.map((row) => mapFeedRow(row, authors));
}

export async function createCirclePost(
  input: CreatePostInput,
  client: DbClient = supabase,
): Promise<string> {
  const { data, error } = await client.rpc('create_circle_post', {
    p_body: input.body,
    p_image_path: input.imagePath ?? undefined,
    p_link_kind: input.linkKind ?? undefined,
    p_link_ref_id: input.linkRefId ?? undefined,
    p_link_description: input.linkDescription ?? undefined,
  });
  if (error) throwCircleError(error, 'Failed to create post.');
  if (typeof data !== 'string') {
    throw new Error('create_circle_post did not return a post id');
  }
  return data;
}

export async function deleteCirclePost(
  postId: string,
  client: DbClient = supabase,
): Promise<string> {
  const { data, error } = await client.rpc('delete_circle_post', {
    p_post_id: postId,
  });
  if (error) throwCircleError(error, 'Failed to delete post.');
  if (typeof data !== 'string') {
    throw new Error('delete_circle_post did not return a post id');
  }
  return data;
}

// ---------------------------------------------------------------------------
// Encouragements (direct table writes under RLS)
// ---------------------------------------------------------------------------

export async function encouragePost(
  postId: string,
  userId: string,
  client: DbClient = supabase,
): Promise<void> {
  const { error } = await client
    .from('post_encouragements')
    .upsert(
      { post_id: postId, user_id: userId },
      { onConflict: 'post_id,user_id', ignoreDuplicates: true },
    );
  if (error) throwCircleError(error, 'Failed to encourage post.');
}

export async function unencouragePost(
  postId: string,
  userId: string,
  client: DbClient = supabase,
): Promise<void> {
  const { error } = await client
    .from('post_encouragements')
    .delete()
    .eq('post_id', postId)
    .eq('user_id', userId);
  if (error) throwCircleError(error, 'Failed to remove encouragement.');
}

// CD-013: expose *who* encouraged, hydrated to friend profiles.
export async function listPostEncouragers(
  postId: string,
  client: DbClient = supabase,
): Promise<CirclesAuthor[]> {
  const { data, error } = await client
    .from('post_encouragements')
    .select('user_id, created_at')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });
  if (error) throw error;

  const rows = (data ?? []) as { user_id: string }[];
  const authors = await hydrateAuthors(
    rows.map((row) => row.user_id),
    client,
  );
  return rows
    .map((row) => authors.get(row.user_id))
    .filter((author): author is CirclesAuthor => author != null);
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

const COMMENT_COLUMNS = 'id, post_id, author_id, body, created_at';

export async function listPostComments(
  postId: string,
  client: DbClient = supabase,
): Promise<PostComment[]> {
  const { data, error } = await client
    .from('post_comments')
    .select(COMMENT_COLUMNS)
    .eq('post_id', postId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });
  if (error) throw error;

  const rows = (data ?? []) as {
    id: string;
    post_id: string;
    author_id: string;
    body: string;
    created_at: string;
  }[];
  const authors = await hydrateAuthors(
    rows.map((row) => row.author_id),
    client,
  );
  return rows.map((row) => ({
    id: row.id,
    postId: row.post_id,
    authorId: row.author_id,
    body: row.body,
    createdAt: row.created_at,
    author: authors.get(row.author_id) ?? null,
  }));
}

export async function createPostComment(
  postId: string,
  userId: string,
  body: string,
  client: DbClient = supabase,
): Promise<string> {
  const { data, error } = await client
    .from('post_comments')
    .insert({ post_id: postId, author_id: userId, body })
    .select('id')
    .single();
  if (error) throwCircleError(error, 'Failed to add comment.');
  return (data as { id: string }).id;
}

// Soft delete via the column-scoped update grant (no delete RPC exists).
export async function deletePostComment(
  commentId: string,
  userId: string,
  client: DbClient = supabase,
): Promise<string> {
  const { data, error } = await client
    .from('post_comments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', commentId)
    .eq('author_id', userId)
    .is('deleted_at', null)
    .select('id')
    .maybeSingle();
  if (error) throwCircleError(error, 'Failed to delete comment.');
  if (!data) {
    throw new CircleDataError(
      'NOT_FOUND',
      'Comment not found or already deleted.',
    );
  }
  return (data as { id: string }).id;
}

// ---------------------------------------------------------------------------
// Saved posts
// ---------------------------------------------------------------------------

export async function savePost(
  postId: string,
  userId: string,
  client: DbClient = supabase,
): Promise<void> {
  const { error } = await client
    .from('saved_posts')
    .upsert(
      { post_id: postId, user_id: userId },
      { onConflict: 'user_id,post_id', ignoreDuplicates: true },
    );
  if (error) throwCircleError(error, 'Failed to save post.');
}

export async function unsavePost(
  postId: string,
  userId: string,
  client: DbClient = supabase,
): Promise<void> {
  const { error } = await client
    .from('saved_posts')
    .delete()
    .eq('post_id', postId)
    .eq('user_id', userId);
  if (error) throwCircleError(error, 'Failed to unsave post.');
}

export async function listSavedPosts(
  client: DbClient = supabase,
): Promise<SavedPost[]> {
  // Embed the live post; circle_posts RLS filters out any whose author is no
  // longer a friend (CD-007). deleted_at is null-filtered here for safety.
  const { data, error } = await client
    .from('saved_posts')
    .select('created_at, post:circle_posts(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as unknown as {
    created_at: string;
    post: CirclePostRow | null;
  }[];
  const posts = rows.filter(
    (row): row is { created_at: string; post: CirclePostRow } =>
      row.post != null && row.post.deleted_at == null,
  );
  const authors = await hydrateAuthors(
    posts.map((row) => row.post.author_id),
    client,
  );
  return posts.map((row) => ({
    savedAt: row.created_at,
    post: mapPostCore(row.post, authors),
  }));
}

// ---------------------------------------------------------------------------
// Public goal
// ---------------------------------------------------------------------------

export async function getMyPublicGoal(
  userId: string,
  client: DbClient = supabase,
): Promise<PublicGoalRef | null> {
  const { data, error } = await client
    .from('goals')
    .select('id, title, category, status')
    .eq('user_id', userId)
    .eq('visibility', 'public')
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as {
    id: string;
    title: string;
    category: string;
    status: string;
  };
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    status: row.status,
  };
}

export async function setPublicGoal(
  goalId: string | null,
  client: DbClient = supabase,
): Promise<string | null> {
  // Pass null explicitly to clear — set_public_goal has no default arg, so an
  // omitted param would be an unknown-function error rather than "make private".
  const { data, error } = await client.rpc('set_public_goal', {
    p_goal_id: goalId as string,
  });
  if (error) throwCircleError(error, 'Failed to update public goal.');
  return (data as string | null) ?? null;
}

// ---------------------------------------------------------------------------
// Shared goals & invites (viewer reads via whitelisted RPCs — CD-004)
// ---------------------------------------------------------------------------

async function summariesWithOwners(
  jsonRows: unknown[],
  client: DbClient,
): Promise<CircleGoalSummary[]> {
  const summaries = jsonRows
    .map((json) => mapGoalSummary(json))
    .filter((summary): summary is CircleGoalSummary => summary != null);
  const authors = await hydrateAuthors(
    summaries.map((summary) => summary.ownerId),
    client,
  );
  return summaries.map((summary) => ({
    ...summary,
    owner: authors.get(summary.ownerId) ?? null,
  }));
}

export async function listFriendPublicGoals(
  client: DbClient = supabase,
): Promise<CircleGoalSummary[]> {
  const { data, error } = await client.rpc('list_friend_public_goals');
  if (error) throw error;
  return summariesWithOwners((data ?? []) as unknown[], client);
}

export async function listGoalsSharedWithMe(
  client: DbClient = supabase,
): Promise<CircleGoalSummary[]> {
  const { data, error } = await client.rpc('list_goals_shared_with_me');
  if (error) throw error;
  return summariesWithOwners((data ?? []) as unknown[], client);
}

export async function listMyGoalInvites(
  client: DbClient = supabase,
): Promise<IncomingGoalInvite[]> {
  const { data, error } = await client.rpc('list_my_goal_invites');
  if (error) throw error;

  const rows = (data ?? []) as {
    invite_id: string;
    created_at: string;
    goal: unknown;
  }[];
  const summaries = rows.map((row) => ({
    inviteId: row.invite_id,
    createdAt: row.created_at,
    goal: mapGoalSummary(row.goal),
  }));
  const authors = await hydrateAuthors(
    summaries
      .map((row) => row.goal?.ownerId)
      .filter((id): id is string => Boolean(id)),
    client,
  );
  return summaries
    .filter(
      (row): row is { inviteId: string; createdAt: string; goal: CircleGoalSummary } =>
        row.goal != null,
    )
    .map((row) => ({
      inviteId: row.inviteId,
      createdAt: row.createdAt,
      goal: { ...row.goal, owner: authors.get(row.goal.ownerId) ?? null },
    }));
}

// CD-014: owner's sent list; declined→pending, withdrawn dropped (mapSentInvite).
export async function listSentGoalInvites(
  userId: string,
  client: DbClient = supabase,
): Promise<SentGoalInvite[]> {
  const { data, error } = await client
    .from('goal_share_invites')
    .select('id, goal_id, owner_id, invitee_id, status, created_at, responded_at')
    .eq('owner_id', userId)
    .in('status', ['pending', 'accepted', 'declined'])
    .order('created_at', { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as unknown as GoalInviteRow[];
  const authors = await hydrateAuthors(
    rows.map((row) => row.invitee_id),
    client,
  );
  return rows
    .map((row) => mapSentInvite(row, authors))
    .filter((invite): invite is SentGoalInvite => invite != null);
}

export async function sendGoalInvites(
  goalId: string,
  inviteeIds: string[],
  client: DbClient = supabase,
): Promise<string[]> {
  const { data, error } = await client.rpc('send_goal_invites', {
    p_goal_id: goalId,
    p_invitee_ids: inviteeIds,
  });
  if (error) throwCircleError(error, 'Failed to send invites.');
  return (data ?? []) as string[];
}

export async function respondToGoalInvite(
  inviteId: string,
  response: 'accepted' | 'declined',
  client: DbClient = supabase,
): Promise<string> {
  const { data, error } = await client.rpc('respond_to_goal_invite', {
    p_invite_id: inviteId,
    p_response: response,
  });
  if (error) throwCircleError(error, 'Failed to respond to invite.');
  if (typeof data !== 'string') {
    throw new Error('respond_to_goal_invite did not return an invite id');
  }
  return data;
}

export async function withdrawGoalInvite(
  inviteId: string,
  client: DbClient = supabase,
): Promise<string> {
  const { data, error } = await client.rpc('withdraw_goal_invite', {
    p_invite_id: inviteId,
  });
  if (error) throwCircleError(error, 'Failed to withdraw invite.');
  if (typeof data !== 'string') {
    throw new Error('withdraw_goal_invite did not return an invite id');
  }
  return data;
}

// ---------------------------------------------------------------------------
// Linkable items for the post composer (owner-only reads under RLS)
// ---------------------------------------------------------------------------

export async function getLinkableItems(
  userId: string,
  client: DbClient = supabase,
): Promise<LinkableItems> {
  const [goalsResult, milestonesResult, reflectionsResult] = await Promise.all([
    client
      .from('goals')
      .select('id, title, category, description')
      .eq('user_id', userId)
      .in('status', SHAREABLE_STATUSES as unknown as string[])
      .order('updated_at', { ascending: false }),
    client
      .from('milestones')
      .select('id, title, goal_id, goals(title, category)')
      .eq('user_id', userId)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false }),
    client
      .from('entries')
      .select('id, title')
      .eq('user_id', userId)
      .eq('entry_type', 'reflection')
      .eq('archived', false)
      .order('created_at', { ascending: false }),
  ]);

  if (goalsResult.error) throw goalsResult.error;
  if (milestonesResult.error) throw milestonesResult.error;
  if (reflectionsResult.error) throw reflectionsResult.error;

  const goals = ((goalsResult.data ?? []) as {
    id: string;
    title: string;
    category: string;
    description: string | null;
  }[]).map((row) => ({
    kind: 'goal' as const,
    id: row.id,
    title: row.title,
    category: row.category,
    description: (row.description ?? '').trim(),
  }));

  const milestones = ((milestonesResult.data ?? []) as unknown as {
    id: string;
    title: string;
    goal_id: string;
    goals: { title: string; category: string } | null;
  }[]).map((row) => ({
    kind: 'milestone' as const,
    id: row.id,
    title: row.title,
    category: row.goals?.category ?? '',
    goalTitle: row.goals?.title ?? '',
  }));

  const reflections = ((reflectionsResult.data ?? []) as {
    id: string;
    title: string;
  }[]).map((row) => ({
    kind: 'reflection' as const,
    id: row.id,
    title: (row.title ?? '').trim() || 'Reflection',
    // Reflections are the intimate Entry type. Never move their body or
    // takeaway into a social composer, even as owner-only suggestion data.
    description: '',
  }));

  return { goals, milestones, reflections };
}
