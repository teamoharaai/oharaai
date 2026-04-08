/**
 * Backfill embedding_text for existing records that have none.
 * Pure string computation — no API calls, no cost.
 *
 * Run:
 *   SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
 *   npx tsx scripts/backfill-embedding-text.ts
 *
 * Or source from .env.local first:
 *   set -a && source .env.local && set +a && npx tsx scripts/backfill-embedding-text.ts
 *
 * Idempotent: skips rows that already have embedding_text.
 * Reports: "X echo entries, Y goals, Z vault items updated"
 */

import { createClient } from '@supabase/supabase-js';
import { buildEchoEmbeddingText, buildGoalEmbeddingText, buildVaultItemEmbeddingText } from '../lib/ai/embedding-text';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('[backfill-embedding-text] Missing required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const BATCH_SIZE = 100;

// ── Echo entries ──────────────────────────────────────────────────────────────

type DbEchoRow = { id: string; content: string };

async function backfillEchoEntries(): Promise<number> {
  const { data, error } = await supabase
    .from('echo_entries')
    .select('id, content')
    .is('embedding_text', null);

  if (error) {
    console.error('[backfill-embedding-text] Failed to fetch echo_entries:', error.message);
    return 0;
  }

  const rows = (data ?? []) as DbEchoRow[];
  if (rows.length === 0) {
    console.log('[backfill-embedding-text] echo_entries: nothing to backfill');
    return 0;
  }

  console.log(`[backfill-embedding-text] echo_entries: ${rows.length} row(s) to process`);

  let updated = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (row) => {
        const embeddingText = buildEchoEmbeddingText(row.content);
        if (!embeddingText) return; // below word floor — leave null

        const { error: updateError } = await supabase
          .from('echo_entries')
          .update({ embedding_text: embeddingText })
          .eq('id', row.id);

        if (updateError) {
          console.error(`[backfill-embedding-text] echo_entries update failed for ${row.id}:`, updateError.message);
        } else {
          updated++;
        }
      }),
    );
  }

  return updated;
}

// ── Goals ─────────────────────────────────────────────────────────────────────

type DbGoalRow = {
  id: string;
  title: string;
  description: string | null;
  measurables: Array<{ title: string }> | null;
};

async function backfillGoals(): Promise<number> {
  const { data, error } = await supabase
    .from('goals')
    .select('id, title, description, measurables(title)')
    .is('embedding_text', null);

  if (error) {
    console.error('[backfill-embedding-text] Failed to fetch goals:', error.message);
    return 0;
  }

  const rows = (data ?? []) as DbGoalRow[];
  if (rows.length === 0) {
    console.log('[backfill-embedding-text] goals: nothing to backfill');
    return 0;
  }

  console.log(`[backfill-embedding-text] goals: ${rows.length} row(s) to process`);

  let updated = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (row) => {
        const embeddingText = buildGoalEmbeddingText(
          row.title,
          row.description,
          row.measurables,
        );

        const { error: updateError } = await supabase
          .from('goals')
          .update({ embedding_text: embeddingText })
          .eq('id', row.id);

        if (updateError) {
          console.error(`[backfill-embedding-text] goals update failed for ${row.id}:`, updateError.message);
        } else {
          updated++;
        }
      }),
    );
  }

  return updated;
}

// ── Vault items ───────────────────────────────────────────────────────────────

type DbVaultItemRow = { id: string; content: string | null };

async function backfillVaultItems(): Promise<number> {
  const { data, error } = await supabase
    .from('vault_items')
    .select('id, content')
    .is('embedding_text', null);

  if (error) {
    console.error('[backfill-embedding-text] Failed to fetch vault_items:', error.message);
    return 0;
  }

  const rows = (data ?? []) as DbVaultItemRow[];
  if (rows.length === 0) {
    console.log('[backfill-embedding-text] vault_items: nothing to backfill');
    return 0;
  }

  console.log(`[backfill-embedding-text] vault_items: ${rows.length} row(s) to process`);

  let updated = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (row) => {
        const embeddingText = buildVaultItemEmbeddingText(row.content);
        if (!embeddingText) return; // below word floor — leave null

        const { error: updateError } = await supabase
          .from('vault_items')
          .update({ embedding_text: embeddingText })
          .eq('id', row.id);

        if (updateError) {
          console.error(`[backfill-embedding-text] vault_items update failed for ${row.id}:`, updateError.message);
        } else {
          updated++;
        }
      }),
    );
  }

  return updated;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('[backfill-embedding-text] Starting...');

  const [echoUpdated, goalsUpdated, vaultItemsUpdated] = await Promise.all([
    backfillEchoEntries(),
    backfillGoals(),
    backfillVaultItems(),
  ]);

  console.log(
    `[backfill-embedding-text] Done. ${echoUpdated} echo entries, ${goalsUpdated} goals, ${vaultItemsUpdated} vault items updated.`,
  );
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error('[backfill-embedding-text] Unexpected error:', message);
  process.exit(1);
});
