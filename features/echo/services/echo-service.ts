import supabase from '@/lib/db/client';
import { AI_CONFIG } from '@/lib/ai/config';
import type { EchoEntry } from '../types';

type DbGoalRef = { id: string; title: string } | null;
type DbBrt = EchoEntry['brt'] | null;
type DbEmotion = EchoEntry['emotion'] | null;

type DbEchoEntry = {
  id: string;
  user_id: string;
  goal_id: string | null;
  content: string;
  media_url: string | null;
  ai_insight_requested: boolean;
  brt: DbBrt;
  emotion: DbEmotion;
  model_version: string | null;
  visibility: EchoEntry['visibility'];
  confidence: number | null;
  themes: string[] | null;
  ai_response: string | null;
  processed_at: string | null;
  created_at: string;
  goals: DbGoalRef;
};

function mapEntry(row: DbEchoEntry): EchoEntry {
  return {
    id: row.id,
    userId: row.user_id,
    goalId: row.goal_id,
    goalTitle: row.goals?.title ?? undefined,
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

type ReflectPayload = {
  reflection: string | null;
  emotion: EchoEntry['emotion'] | null;
  brt: EchoEntry['brt'] | null;
  confidence: number | null;
  summarized: boolean;
};

export type CreateEntryResultStatus =
  | 'saved'
  | 'saved_without_summary'
  | 'offline'
  | 'unconfirmed';

export type CreateEntryResult = {
  status: CreateEntryResultStatus;
  entry?: EchoEntry;
};

function isNetworkError(error: unknown): boolean {
  if (!error) return false;

  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'message' in error
        ? String(error.message)
        : String(error);

  return /network request failed|failed to fetch|networkerror|load failed|offline/i.test(message);
}

async function requestEchoReflection(
  content: string,
  aiInsightRequested: boolean,
): Promise<ReflectPayload | null> {
  if (!aiInsightRequested) {
    return null;
  }

  const response = await fetch('/api/echo/reflect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content,
      aiInsightRequested,
    }),
  });

  if (!response.ok) {
    let message = 'Echo reflection request failed';

    try {
      const errorData = (await response.json()) as { error?: string; details?: string };
      const detail = errorData.details ? ` ${errorData.details}` : '';
      message = (errorData.error ?? message) + detail;
    } catch {
      // Keep the generic fallback when the error body is unavailable.
    }

    throw new Error(message);
  }

  const data = (await response.json()) as ReflectPayload;
  return data;
}

export async function fetchEntries(userId: string): Promise<EchoEntry[]> {
  const { data, error } = await supabase
    .from('echo_entries')
    .select('*, goals(id, title)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return (data as unknown as DbEchoEntry[]).map(mapEntry);
}

export async function getEntriesByGoalId(goalId: string): Promise<EchoEntry[]> {
  const { data, error } = await supabase
    .from('echo_entries')
    .select('*, goals(id, title)')
    .eq('goal_id', goalId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return (data as unknown as DbEchoEntry[]).map(mapEntry);
}

export async function createEntry(params: {
  userId: string;
  content: string;
  goalId: string | null;
  aiInsightRequested: boolean;
  brt: EchoEntry['brt'] | null;
  emotion: EchoEntry['emotion'] | null;
}): Promise<CreateEntryResult> {
  const { data, error } = await supabase
    .from('echo_entries')
    .insert({
      user_id: params.userId,
      content: params.content,
      goal_id: params.goalId,
      ai_insight_requested: params.aiInsightRequested,
      brt: params.brt,
      emotion: params.emotion,
    })
    .select('*, goals(id, title)')
    .single();

  if (error || !data) {
    return { status: isNetworkError(error) ? 'offline' : 'unconfirmed' };
  }

  const insertedEntry = mapEntry(data as unknown as DbEchoEntry);

  if (!params.aiInsightRequested) {
    return { status: 'saved', entry: insertedEntry };
  }

  let reflectPayload: ReflectPayload | null;
  try {
    reflectPayload = await requestEchoReflection(params.content, params.aiInsightRequested);
  } catch {
    return { status: 'saved_without_summary', entry: insertedEntry };
  }

  if (!reflectPayload || !reflectPayload.summarized || !reflectPayload.reflection) {
    return { status: 'saved_without_summary', entry: insertedEntry };
  }

  const processedAt = new Date().toISOString();
  const { data: updatedData, error: updateError } = await supabase
    .from('echo_entries')
    .update({
      ai_response: reflectPayload.reflection,
      emotion: reflectPayload.emotion,
      brt: reflectPayload.brt,
      confidence: reflectPayload.confidence,
      model_version: AI_CONFIG.models.default,
      processed_at: processedAt,
      summarized: true,
    })
    .eq('id', insertedEntry.id)
    .select('*, goals(id, title)')
    .single();

  if (updateError || !updatedData) {
    return { status: 'saved_without_summary', entry: insertedEntry };
  }

  return { status: 'saved', entry: mapEntry(updatedData as unknown as DbEchoEntry) };
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
