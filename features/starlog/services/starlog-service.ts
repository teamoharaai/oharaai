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

async function requestStarlogReflection(
  content: string,
  aiInsightRequested: boolean,
): Promise<string | null> {
  if (!aiInsightRequested) {
    return null;
  }

  const response = await fetch('/api/starlog/reflect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content,
      aiInsightRequested,
    }),
  });

  if (!response.ok) {
    const errorData = (await response.json()) as { error?: string; details?: string };
    const detail = errorData.details ? ` ${errorData.details}` : '';
    throw new Error((errorData.error ?? 'Starlog reflection request failed') + detail);
  }

  const data = (await response.json()) as { reflection?: string | null };
  return data.reflection ?? null;
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

  const insertedEntry = mapEntry(data as unknown as DbStarlogEntry);
  const reflection = await requestStarlogReflection(params.content, params.aiInsightRequested);

  if (!reflection) {
    return insertedEntry;
  }

  const processedAt = new Date().toISOString();
  const { data: updatedData, error: updateError } = await supabase
    .from('starlog_entries')
    .update({
      ai_response: reflection,
      processed_at: processedAt,
    })
    .eq('id', insertedEntry.id)
    .select('*, goals(id, title)')
    .single();

  if (updateError || !updatedData) {
    return {
      ...insertedEntry,
      aiResponse: reflection,
      processedAt: new Date(processedAt),
    };
  }

  return mapEntry(updatedData as unknown as DbStarlogEntry);
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
