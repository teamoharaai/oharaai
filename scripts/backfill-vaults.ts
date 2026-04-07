/**
 * Vault backfill script
 * Creates a vault for every goal that does not already have one.
 *
 * Run once manually:
 *   npx tsx scripts/backfill-vaults.ts
 *
 * Prerequisites — set env vars before running:
 *   SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
 *   npx tsx scripts/backfill-vaults.ts
 *
 * Or source from .env.local first:
 *   set -a && source .env.local && set +a && npx tsx scripts/backfill-vaults.ts
 *
 * Uses the service role key (not the anon key) to bypass RLS.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    '[backfill] Missing required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY',
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

type GoalRow = { id: string; user_id: string };
type VaultGoalRow = { goal_id: string };

async function main(): Promise<void> {
  // 1. Fetch all vault goal_ids (to build exclusion set)
  const { data: existingVaults, error: vaultFetchError } = await supabase
    .from('vaults')
    .select('goal_id');

  if (vaultFetchError) {
    console.error('[backfill] Failed to fetch existing vaults:', vaultFetchError.message);
    process.exit(1);
  }

  const vaultedGoalIds = new Set(
    ((existingVaults ?? []) as VaultGoalRow[]).map((v) => v.goal_id),
  );

  // 2. Fetch all goals
  const { data: allGoals, error: goalsFetchError } = await supabase
    .from('goals')
    .select('id, user_id');

  if (goalsFetchError) {
    console.error('[backfill] Failed to fetch goals:', goalsFetchError.message);
    process.exit(1);
  }

  const goals = (allGoals ?? []) as GoalRow[];
  const unvaultedGoals = goals.filter((g) => !vaultedGoalIds.has(g.id));

  console.log(
    `[backfill] Found ${unvaultedGoals.length} unvaulted goal(s) out of ${goals.length} total.`,
  );

  if (unvaultedGoals.length === 0) {
    console.log('[backfill] Done. No vaults needed.');
    return;
  }

  // 3. Insert a vault for each unvaulted goal
  let created = 0;
  let errors = 0;

  for (const goal of unvaultedGoals) {
    const { error: insertError } = await supabase.from('vaults').insert({
      user_id: goal.user_id,
      goal_id: goal.id,
      space_id: null,
      vault_type: 'personal',
    });

    if (insertError) {
      console.error(
        `[backfill] Error creating vault for goal ${goal.id}:`,
        insertError.message,
      );
      errors += 1;
    } else {
      console.log(`[backfill] Created vault for goal ${goal.id}`);
      created += 1;
    }
  }

  console.log(`[backfill] Done. Created ${created} vault(s), ${errors} error(s).`);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error('[backfill] Unexpected error:', message);
  process.exit(1);
});
