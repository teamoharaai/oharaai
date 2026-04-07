import type { SupabaseClient } from '@supabase/supabase-js';
import supabase from './client';
import type { EchoGoalLink, EchoLinkSource } from '@/types/echo-link';
import type { EchoEntry } from '@/features/echo/types';

type DbClient = SupabaseClient;

// ── DB row types ──────────────────────────────────────────────────────────────

type DbEchoGoalLinkRow = {
  id: string;
  echo_entry_id: string;
  goal_id: string;
  link_source: EchoLinkSource;
  confidence: number | null;
  confirmed: boolean;
  created_at: string;
};

type DbEchoEntryRow = {
  id: string;
  user_id: string;
  goal_id: string | null;
  content: string;
  media_url: string | null;
  ai_insight_requested: boolean;
  brt: EchoEntry['brt'] | null;
  emotion: EchoEntry['emotion'] | null;
  model_version: string | null;
  visibility: EchoEntry['visibility'];
  confidence: number | null;
  themes: string[] | null;
  ai_response: string | null;
  processed_at: string | null;
  created_at: string;
};

// ── Mappers ───────────────────────────────────────────────────────────────────

function mapLink(row: DbEchoGoalLinkRow): EchoGoalLink {
  return {
    id: row.id,
    echoEntryId: row.echo_entry_id,
    goalId: row.goal_id,
    linkSource: row.link_source,
    confidence: row.confidence,
    confirmed: row.confirmed,
    createdAt: row.created_at,
  };
}

function mapEchoEntry(row: DbEchoEntryRow): EchoEntry {
  return {
    id: row.id,
    userId: row.user_id,
    goalId: row.goal_id,
    content: row.content,
    mediaUrl: row.media_url ?? undefined,
    aiInsightRequested: row.ai_insight_requested,
    brt: row.brt ?? undefined,
    emotion: row.emotion ?? undefined,
    modelVersion: row.model_version ?? undefined,
    visibility: row.visibility,
    confidence: row.confidence ?? undefined,
    themes: row.themes ?? undefined,
    aiResponse: row.ai_response ?? undefined,
    processedAt: row.processed_at ? new Date(row.processed_at) : undefined,
    createdAt: new Date(row.created_at),
  };
}

// ── Service functions ─────────────────────────────────────────────────────────

export async function getLinksForEchoEntry(
  echoEntryId: string,
  client: DbClient = supabase,
): Promise<EchoGoalLink[]> {
  const { data, error } = await client
    .from('echo_goal_links')
    .select('id, echo_entry_id, goal_id, link_source, confidence, confirmed, created_at')
    .eq('echo_entry_id', echoEntryId);

  if (error) throw new Error(error.message);
  return (data as unknown as DbEchoGoalLinkRow[] ?? []).map(mapLink);
}

export async function getLinksForGoal(
  goalId: string,
  client: DbClient = supabase,
): Promise<EchoGoalLink[]> {
  const { data, error } = await client
    .from('echo_goal_links')
    .select('id, echo_entry_id, goal_id, link_source, confidence, confirmed, created_at')
    .eq('goal_id', goalId);

  if (error) throw new Error(error.message);
  return (data as unknown as DbEchoGoalLinkRow[] ?? []).map(mapLink);
}

export async function getEchoEntriesForGoal(
  goalId: string,
  client: DbClient = supabase,
): Promise<Array<EchoEntry & { linkMetadata: EchoGoalLink }>> {
  const links = await getLinksForGoal(goalId, client);
  if (links.length === 0) return [];

  const entryIds = links.map((l) => l.echoEntryId);
  const linkByEntryId = new Map(links.map((l) => [l.echoEntryId, l]));

  const { data, error } = await client
    .from('echo_entries')
    .select('id, user_id, goal_id, content, media_url, ai_insight_requested, brt, emotion, model_version, visibility, confidence, themes, ai_response, processed_at, created_at')
    .in('id', entryIds);

  if (error) throw new Error(error.message);

  return (data as unknown as DbEchoEntryRow[] ?? []).map((row) => ({
    ...mapEchoEntry(row),
    linkMetadata: linkByEntryId.get(row.id)!,
  }));
}

export async function createLink(
  echoEntryId: string,
  goalId: string,
  source: EchoLinkSource,
  confidence?: number,
  client: DbClient = supabase,
): Promise<EchoGoalLink> {
  const { data, error } = await client
    .from('echo_goal_links')
    .insert({
      echo_entry_id: echoEntryId,
      goal_id: goalId,
      link_source: source,
      confidence: confidence ?? null,
      confirmed: false,
    })
    .select('id, echo_entry_id, goal_id, link_source, confidence, confirmed, created_at')
    .single();

  if (error) throw error;
  if (!data) throw new Error('Failed to create echo-goal link');
  return mapLink(data as unknown as DbEchoGoalLinkRow);
}

export async function confirmLink(
  linkId: string,
  client: DbClient = supabase,
): Promise<void> {
  const { error } = await client
    .from('echo_goal_links')
    .update({ confirmed: true })
    .eq('id', linkId);

  if (error) throw error;
}

export async function dismissLink(
  linkId: string,
  client: DbClient = supabase,
): Promise<void> {
  const { error } = await client
    .from('echo_goal_links')
    .delete()
    .eq('id', linkId);

  if (error) throw error;
}

export async function getUnconfirmedLinksForUserGoals(
  userId: string,
  client: DbClient = supabase,
): Promise<EchoGoalLink[]> {
  const { data: goals, error: goalError } = await client
    .from('goals')
    .select('id')
    .eq('user_id', userId);

  if (goalError) throw goalError;

  const goalIds = (goals as unknown as { id: string }[] ?? []).map((goal) => goal.id);
  if (goalIds.length === 0) return [];

  const { data, error } = await client
    .from('echo_goal_links')
    .select('id, echo_entry_id, goal_id, link_source, confidence, confirmed, created_at')
    .in('goal_id', goalIds)
    .eq('confirmed', false);

  if (error) throw error;
  return (data as unknown as DbEchoGoalLinkRow[] ?? []).map(mapLink);
}

export async function getEchoLinkByIdForUserGoal(
  linkId: string,
  userId: string,
  client: DbClient = supabase,
): Promise<EchoGoalLink | null> {
  const { data: linkRow, error: linkError } = await client
    .from('echo_goal_links')
    .select('id, echo_entry_id, goal_id, link_source, confidence, confirmed, created_at')
    .eq('id', linkId)
    .maybeSingle();

  if (linkError) throw linkError;
  if (!linkRow) return null;

  const row = linkRow as unknown as DbEchoGoalLinkRow;
  const { data: goal, error: goalError } = await client
    .from('goals')
    .select('id')
    .eq('id', row.goal_id)
    .eq('user_id', userId)
    .maybeSingle();

  if (goalError) throw goalError;
  if (!goal) return null;

  return mapLink(row);
}

export async function createLinkForUserGoal(
  echoEntryId: string,
  goalId: string,
  userId: string,
  source: EchoLinkSource,
  confidence?: number,
  client: DbClient = supabase,
): Promise<EchoGoalLink | null> {
  const { data: goal, error: goalError } = await client
    .from('goals')
    .select('id')
    .eq('id', goalId)
    .eq('user_id', userId)
    .maybeSingle();

  if (goalError) throw goalError;
  if (!goal) return null;

  return createLink(echoEntryId, goalId, source, confidence, client);
}

export async function getUnconfirmedLinksForUser(
  userId: string,
  client: DbClient = supabase,
): Promise<EchoGoalLink[]> {
  return getUnconfirmedLinksForUserGoals(userId, client);
}
