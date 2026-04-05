import supabase from '@/lib/db/client';
import { AI_CONFIG } from '@/lib/ai/config';
import type { AiResponse } from '@/lib/ai/contracts';
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
  | 'rate_limited'
  | 'offline'
  | 'unconfirmed';

export type SubmissionFailureStatus = Extract<CreateEntryResultStatus, 'offline' | 'unconfirmed'>;

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

export function getSubmissionFailureStatus(error: unknown): SubmissionFailureStatus {
  return isNetworkError(error) ? 'offline' : 'unconfirmed';
}

async function requestEchoReflection(
  content: string,
  aiInsightRequested: boolean,
  accessToken: string,
): Promise<ReflectPayload | null> {
  if (!aiInsightRequested) {
    return null;
  }

  if (!accessToken.trim()) {
    throw new Error('Missing access token for Echo reflection request');
  }

  const response = await fetch('/api/echo/reflect', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      content,
      aiInsightRequested,
    }),
  });

  let body: AiResponse<ReflectPayload>;
  try {
    body = (await response.json()) as AiResponse<ReflectPayload>;
  } catch {
    throw new Error('Echo reflection request failed');
  }

  if (!body.ok) {
    const { code, message } = body.error;
    if (response.status === 429 && code === 'RATE_LIMITED') {
      const error = new Error(message);
      error.name = 'RateLimitedEchoReflectionError';
      throw error;
    }
    throw new Error(message);
  }

  return body.data;
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
  let data: DbEchoEntry | null = null;
  let error: unknown = null;
  try {
    const result = await supabase
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

    data = (result.data as DbEchoEntry | null) ?? null;
    error = result.error;
  } catch (insertError) {
    return { status: getSubmissionFailureStatus(insertError) };
  }

  if (error || !data) {
    return { status: getSubmissionFailureStatus(error) };
  }

  const insertedEntry = mapEntry(data as unknown as DbEchoEntry);

  if (!params.aiInsightRequested) {
    return { status: 'saved', entry: insertedEntry };
  }

  let reflectPayload: ReflectPayload | null;
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    reflectPayload = await requestEchoReflection(
      params.content,
      params.aiInsightRequested,
      session?.access_token ?? '',
    );
  } catch (error) {
    if (error instanceof Error && error.name === 'RateLimitedEchoReflectionError') {
      return { status: 'rate_limited', entry: insertedEntry };
    }

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
