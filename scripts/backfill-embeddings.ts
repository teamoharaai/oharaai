/**
 * Backfill embedding vectors for records that have embedding_text but no vector.
 * Calls Voyage AI — consumes tokens. Run AFTER backfill-embedding-text.ts.
 *
 * Run:
 *   SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
 *   VOYAGE_API_KEY=pa-... \
 *   npx tsx scripts/backfill-embeddings.ts
 *
 * Or source from .env.local first:
 *   set -a && source .env.local && set +a && npx tsx scripts/backfill-embeddings.ts
 *
 * Idempotent: skips rows that already have an embedding.
 * Processes 10 records per batch with 200ms between batches.
 * Per-record errors are logged and skipped — the batch continues.
 * Reports: "Embedded X/Y records" per table.
 */

import { createClient } from '@supabase/supabase-js';
import { generateEmbedding } from '../lib/ai/embeddings';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('[backfill-embeddings] Missing required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// VOYAGE_API_KEY is read inside generateEmbedding — will throw AIEmbeddingKeyMissingError if absent.

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 200;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Generic batch embedder ─────────────────────────────────────────────────────

type EmbeddableRow = { id: string; embedding_text: string };

async function embedTable(
  tableName: string,
  rows: EmbeddableRow[],
): Promise<{ embedded: number; total: number }> {
  if (rows.length === 0) {
    console.log(`[backfill-embeddings] ${tableName}: nothing to embed`);
    return { embedded: 0, total: 0 };
  }

  console.log(`[backfill-embeddings] ${tableName}: ${rows.length} record(s) to embed`);

  let embedded = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);

    for (const row of batch) {
      try {
        const vector = await generateEmbedding(row.embedding_text, 'document');

        if (!vector) {
          // Text didn't meet the word floor inside generateEmbedding — skip silently.
          continue;
        }

        const { error: updateError } = await supabase
          .from(tableName)
          .update({
            embedding: vector as unknown as string, // supabase-js sends as JSON array; pgvector accepts it
            embedding_model: 'voyage-4-lite',
          })
          .eq('id', row.id);

        if (updateError) {
          console.error(`[backfill-embeddings] ${tableName} update failed for ${row.id}:`, updateError.message);
        } else {
          embedded++;
          if (embedded % 10 === 0) {
            console.log(`[backfill-embeddings] ${tableName}: embedded ${embedded}/${rows.length}`);
          }
        }
      } catch (err) {
        console.error(
          `[backfill-embeddings] ${tableName} embedding failed for ${row.id}:`,
          err instanceof Error ? err.message : String(err),
        );
        // Continue — do not abort the batch
      }
    }

    if (i + BATCH_SIZE < rows.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  return { embedded, total: rows.length };
}

// ── Fetch helpers ─────────────────────────────────────────────────────────────

async function fetchEmbeddable(tableName: string): Promise<EmbeddableRow[]> {
  const { data, error } = await supabase
    .from(tableName)
    .select('id, embedding_text')
    .not('embedding_text', 'is', null)
    .is('embedding', null);

  if (error) {
    console.error(`[backfill-embeddings] Failed to fetch ${tableName}:`, error.message);
    return [];
  }

  return (data ?? []) as EmbeddableRow[];
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('[backfill-embeddings] Starting...');

  // Fetch all three tables in parallel, then embed sequentially to respect rate limits.
  const [echoRows, goalRows, vaultRows] = await Promise.all([
    fetchEmbeddable('echo_entries'),
    fetchEmbeddable('goals'),
    fetchEmbeddable('vault_items'),
  ]);

  const echoResult = await embedTable('echo_entries', echoRows);
  const goalResult = await embedTable('goals', goalRows);
  const vaultResult = await embedTable('vault_items', vaultRows);

  console.log(
    `[backfill-embeddings] Done.`,
    `echo_entries: ${echoResult.embedded}/${echoResult.total},`,
    `goals: ${goalResult.embedded}/${goalResult.total},`,
    `vault_items: ${vaultResult.embedded}/${vaultResult.total}`,
  );
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error('[backfill-embeddings] Unexpected error:', message);
  process.exit(1);
});
