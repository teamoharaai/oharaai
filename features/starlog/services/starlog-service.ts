import supabase from '@/lib/db/client';
import type { StarlogEntry } from '../types';

type DbGoalRef = { id: string; title: string } | null;

type DbStarlogEntry = {
  id: string;
  user_id: string;
  goal_id: string | null;
  content: string;
  media_url: string | null;
  ai_insight_requested: boolean;
  classification: string | null;
  confidence: number | null;
  themes: string[] | null;
  ai_response: string | null;
  processed_at: string | null;
  created_at: string;
  goals: DbGoalRef;
};

function mapEntry(row: DbStarlogEntry): StarlogEntry {
  return {
    id: row.id,
    userId: row.user_id,
    goalId: row.goal_id,
    goalTitle: row.goals?.title ?? undefined,
    content: row.content,
    mediaUrl: row.media_url ?? undefined,
    aiInsightRequested: row.ai_insight_requested,
    classification: row.classification as StarlogEntry['classification'],
    confidence: row.confidence ?? undefined,
    themes: row.themes ?? undefined,
    aiResponse: row.ai_response ?? undefined,
    processedAt: row.processed_at ? new Date(row.processed_at) : undefined,
    createdAt: new Date(row.created_at),
  };
}

export async function fetchEntries(userId: string): Promise<StarlogEntry[]> {
  const { data, error } = await supabase
    .from('starlog_entries')
    .select('*, goals(id, title)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return (data as unknown as DbStarlogEntry[]).map(mapEntry);
}

export async function getEntriesByGoalId(goalId: string): Promise<StarlogEntry[]> {
  const { data, error } = await supabase
    .from('starlog_entries')
    .select('*, goals(id, title)')
    .eq('goal_id', goalId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return (data as unknown as DbStarlogEntry[]).map(mapEntry);
}

export async function createEntry(params: {
  userId: string;
  content: string;
  goalId: string | null;
  aiInsightRequested: boolean;
}): Promise<StarlogEntry | null> {
  const { data, error } = await supabase
    .from('starlog_entries')
    .insert({
      user_id: params.userId,
      content: params.content,
      goal_id: params.goalId,
      ai_insight_requested: params.aiInsightRequested,
    })
    .select('*, goals(id, title)')
    .single();

  if (error || !data) return null;
  return mapEntry(data as unknown as DbStarlogEntry);
}

export async function fetchActiveGoalsForPicker(
  userId: string,
): Promise<Array<{ id: string; title: string }>> {
  const { data, error } = await supabase
    .from('goals')
    .select('id, title')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return data as Array<{ id: string; title: string }>;
}
