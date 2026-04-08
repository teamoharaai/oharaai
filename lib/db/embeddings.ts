import supabase from './client';
import { generateEmbedding } from '@/lib/ai/embeddings';

// ── Result types ──────────────────────────────────────────────────────────────

export interface EchoMatchResult {
  id: string;
  userId: string;
  content: string;
  goalId: string | null;
  brt: Record<string, string[]> | null;
  createdAt: string;
  similarity: number;
}

export interface GoalMatchResult {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  category: string | null;
  status: string;
  smartData: Record<string, unknown> | null;
  createdAt: string;
  similarity: number;
}

export interface VaultItemMatchResult {
  id: string;
  vaultId: string;
  itemType: string;
  title: string | null;
  content: string | null;
  createdBy: string;
  createdAt: string;
  similarity: number;
}

// ── DB row types (snake_case, mirrors Postgres function return shapes) ────────

type DbEchoMatchRow = {
  id: string;
  user_id: string;
  content: string;
  goal_id: string | null;
  brt: Record<string, string[]> | null;
  created_at: string;
  similarity: number;
};

type DbGoalMatchRow = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: string | null;
  status: string;
  smart_data: Record<string, unknown> | null;
  created_at: string;
  similarity: number;
};

type DbVaultItemMatchRow = {
  id: string;
  vault_id: string;
  item_type: string;
  title: string | null;
  content: string | null;
  created_by: string;
  created_at: string;
  similarity: number;
};

// ── Mappers ───────────────────────────────────────────────────────────────────

function mapEchoMatch(row: DbEchoMatchRow): EchoMatchResult {
  return {
    id: row.id,
    userId: row.user_id,
    content: row.content,
    goalId: row.goal_id,
    brt: row.brt,
    createdAt: row.created_at,
    similarity: row.similarity,
  };
}

function mapGoalMatch(row: DbGoalMatchRow): GoalMatchResult {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description,
    category: row.category,
    status: row.status,
    smartData: row.smart_data,
    createdAt: row.created_at,
    similarity: row.similarity,
  };
}

function mapVaultItemMatch(row: DbVaultItemMatchRow): VaultItemMatchResult {
  return {
    id: row.id,
    vaultId: row.vault_id,
    itemType: row.item_type,
    title: row.title,
    content: row.content,
    createdBy: row.created_by,
    createdAt: row.created_at,
    similarity: row.similarity,
  };
}

// ── Retrieval functions ───────────────────────────────────────────────────────

export async function findSimilarEchoEntries(
  queryText: string,
  userId: string,
  limit?: number,
): Promise<EchoMatchResult[]> {
  const embedding = await generateEmbedding(queryText, 'query');

  if (embedding === null) {
    return [];
  }

  const { data, error } = await supabase.rpc('match_echo_entries', {
    query_embedding: embedding,
    match_user_id: userId,
    match_limit: limit ?? 5,
  });

  if (error) {
    throw new Error(`match_echo_entries failed: ${error.message}`);
  }

  return ((data ?? []) as unknown as DbEchoMatchRow[]).map(mapEchoMatch);
}

export async function findSimilarGoals(
  queryText: string,
  userId: string,
  limit?: number,
): Promise<GoalMatchResult[]> {
  const embedding = await generateEmbedding(queryText, 'query');

  if (embedding === null) {
    return [];
  }

  const { data, error } = await supabase.rpc('match_goals', {
    query_embedding: embedding,
    match_user_id: userId,
    match_limit: limit ?? 5,
  });

  if (error) {
    throw new Error(`match_goals failed: ${error.message}`);
  }

  return ((data ?? []) as unknown as DbGoalMatchRow[]).map(mapGoalMatch);
}

export async function findSimilarVaultItems(
  queryText: string,
  userId: string,
  limit?: number,
): Promise<VaultItemMatchResult[]> {
  const embedding = await generateEmbedding(queryText, 'query');

  if (embedding === null) {
    return [];
  }

  const { data, error } = await supabase.rpc('match_vault_items', {
    query_embedding: embedding,
    match_user_id: userId,
    match_limit: limit ?? 5,
  });

  if (error) {
    throw new Error(`match_vault_items failed: ${error.message}`);
  }

  return ((data ?? []) as unknown as DbVaultItemMatchRow[]).map(mapVaultItemMatch);
}
