import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationPath = decodeURIComponent(
  new URL('../../supabase/migrations/038_momentum_foundation.sql', import.meta.url).pathname,
);
const v1MigrationPath = decodeURIComponent(
  new URL('../../supabase/migrations/040_momentum_v1.sql', import.meta.url).pathname,
);
const v1RecalculationMigrationPath = decodeURIComponent(
  new URL('../../supabase/migrations/041_momentum_v1_recalculation_baseline.sql', import.meta.url).pathname,
);
const v11BaselineMigrationPath = decodeURIComponent(
  new URL('../../supabase/migrations/043_momentum_v1_1_cross_version_baseline.sql', import.meta.url).pathname,
);

test('Momentum tables are private and owner-readable only', async () => {
  const sql = await readFile(migrationPath, 'utf8');
  for (const table of ['momentum_profiles', 'momentum_events', 'momentum_weekly_snapshots']) {
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`, 'i'));
    assert.match(sql, new RegExp(`on public\\.${table}\\s+for select using \\(user_id = auth\\.uid\\(\\)\\)`, 'i'));
  }
  assert.doesNotMatch(sql, /for insert with check/i);
  assert.doesNotMatch(sql, /for update using/i);
  assert.match(sql, /revoke insert, update, delete on public\.momentum_weekly_snapshots from anon, authenticated/i);
  assert.match(sql, /before update or delete on public\.momentum_weekly_snapshots/i);
  assert.match(sql, /Momentum snapshots are immutable; publish a superseding revision/i);
});

test('V1 Goal Momentum persistence is additive, immutable, owner-readable, and server-written', async () => {
  const sql = await readFile(v1MigrationPath, 'utf8');
  for (const table of ['goal_difficulty_profiles', 'goal_momentum_profiles', 'goal_momentum_weekly_snapshots']) {
    assert.match(sql, new RegExp(`create table if not exists public\\.${table}`, 'i'));
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`, 'i'));
    assert.match(sql, new RegExp(`on public\\.${table}\\s+for select using \\(user_id = auth\\.uid\\(\\)\\)`, 'i'));
    assert.match(sql, new RegExp(`revoke insert, update, delete on public\\.${table} from anon, authenticated`, 'i'));
  }
  assert.match(sql, /before update or delete on public\.goal_momentum_weekly_snapshots/i);
  assert.match(sql, /auth\.role\(\) <> 'service_role'/i);
  assert.match(sql, /Goal ownership validation failed/i);
  assert.match(sql, /unique \(user_id, goal_id, week_start, algorithm_version, calculation_hash\)/i);
  assert.match(sql, /supersedes_snapshot_id/i);
  assert.match(sql, /recalculation baseline does not match the stored snapshot/i);
  assert.match(sql, /previous value does not match the latest earlier V1 snapshot/i);
  assert.match(sql, /grant execute on function public\.publish_goal_momentum_v1_snapshot[\s\S]*to service_role/i);
  assert.match(sql, /grant execute on function public\.publish_ohara_momentum_v1_snapshot[\s\S]*to service_role/i);
  assert.doesNotMatch(sql, /grant execute on function public\.publish_(?:goal|ohara)_momentum_v1_snapshot[\s\S]*to authenticated/i);
});

test('V1 OHARA recalculation baseline fix is additive and remains service-role-only', async () => {
  const sql = await readFile(v1RecalculationMigrationPath, 'utf8');
  assert.match(sql, /create or replace function public\.publish_ohara_momentum_v1_snapshot/i);
  assert.match(sql, /coalesce\(p_previous_value, 0\)/i);
  assert.match(sql, /recalculation baseline does not match the stored snapshot/i);
  assert.match(sql, /previous value does not match the latest earlier V1 snapshot/i);
  assert.match(sql, /revoke all on function public\.publish_ohara_momentum_v1_snapshot/i);
  assert.match(sql, /from public, anon, authenticated/i);
  assert.match(sql, /grant execute on function public\.publish_ohara_momentum_v1_snapshot[\s\S]*to service_role/i);
  assert.doesNotMatch(sql, /grant execute on function public\.publish_ohara_momentum_v1_snapshot[\s\S]*to authenticated/i);
});

test('V1.1 closed-week publishers accept only the latest cross-version closed baseline', async () => {
  const sql = await readFile(v11BaselineMigrationPath, 'utf8');
  assert.match(sql, /week_start < p_week_start/i);
  assert.doesNotMatch(sql, /algorithm_version = p_algorithm_version\s+and week_start < p_week_start/i);
  assert.match(sql, /algorithm_version like 'ohara-momentum-v%'/i);
  assert.match(sql, /latest earlier closed snapshot/i);
  assert.match(sql, /V1\.1 provisional values are never persisted/i);
  assert.match(sql, /from public, anon, authenticated/i);
  assert.match(sql, /grant execute on function public\.publish_goal_momentum_v1_snapshot[\s\S]*to service_role/i);
  assert.match(sql, /grant execute on function public\.publish_ohara_momentum_v1_snapshot[\s\S]*to service_role/i);
  assert.doesNotMatch(sql, /to authenticated/i);
});

test('snapshot publication locks the profile and deduplicates identical hashes', async () => {
  const sql = await readFile(migrationPath, 'utf8');
  assert.match(sql, /where user_id = v_user_id for update/i);
  assert.match(sql, /v_existing\.calculation_hash = p_calculation_hash/i);
  assert.match(sql, /unique \(user_id, week_start, algorithm_version, calculation_hash\)/i);
  assert.match(sql, /supersedes_snapshot_id/i);
  assert.match(sql, /on conflict \(user_id, deduplication_key\) do nothing/i);
  assert.match(sql, /recalculation baseline does not match the stored snapshot/i);
});

test('Momentum publication is trusted-server-only and rejects invalid inputs', async () => {
  const sql = await readFile(migrationPath, 'utf8');
  assert.match(sql, /v_user_id uuid := p_user_id/i);
  assert.match(sql, /auth\.role\(\) <> 'service_role'/i);
  assert.match(sql, /Momentum week must be Monday through Sunday/i);
  assert.match(sql, /Momentum week must start on Monday/i);
  assert.match(sql, /valid IANA timezone/i);
  assert.match(sql, /Momentum values must be non-negative/i);
  assert.match(sql, /revoke all on function public\.publish_momentum_snapshot/i);
  assert.match(sql, /from anon, authenticated/i);
  assert.match(sql, /grant execute on function public\.publish_momentum_snapshot[\s\S]*to service_role/i);
  assert.match(sql, /set search_path = pg_catalog, public/i);
  assert.doesNotMatch(sql, /grant execute on function public\.publish_momentum_snapshot[\s\S]*to authenticated/i);
});
