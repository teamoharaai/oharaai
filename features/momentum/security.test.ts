import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationPath = decodeURIComponent(
  new URL('../../supabase/migrations/038_momentum_foundation.sql', import.meta.url).pathname,
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
