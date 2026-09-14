import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const lifecycle = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/047_goal_lifecycle_foundation.sql'),
  'utf8',
);

test('defines explicit lifecycle states and trustworthy transition timestamps', () => {
  assert.match(lifecycle, /'active', 'draft', 'complete', 'stagnant', 'discovered', 'archived', 'expired'/);
  assert.match(lifecycle, /add column if not exists completed_at timestamptz/);
  assert.match(lifecycle, /add column if not exists archived_at timestamptz/);
  assert.match(lifecycle, /add column if not exists expired_at timestamptz/);
  assert.match(lifecycle, /if new\.status = 'complete'[\s\S]*new\.completed_at := coalesce\(new\.completed_at, now\(\)\)/);
});

test('repairs duplicate active phases without deleting history or fabricating a timestamp', () => {
  const repair = lifecycle.match(/-- Repair the known duplicate-phase state[\s\S]*?-- Reconcile pre-existing/)?.[0] ?? '';
  assert.match(repair, /update public\.goals predecessor[\s\S]*set status = 'archived'/);
  assert.match(repair, /successor\.previous_goal_id = predecessor\.id[\s\S]*successor\.status = 'active'/);
  assert.doesNotMatch(repair, /archived_at\s*=/);
  assert.doesNotMatch(repair, /delete from/);
});

test('same-ID extension records deadline history and reactivates an expired Goal', () => {
  assert.match(lifecycle, /create table public\.goal_deadline_history/);
  assert.match(lifecycle, /previous_deadline timestamptz[\s\S]*new_deadline timestamptz[\s\S]*changed_at timestamptz/);
  assert.match(lifecycle, /create or replace function public\.extend_goal_deadline_v1[\s\S]*where id = p_goal_id and user_id = auth\.uid\(\)[\s\S]*for update/);
  assert.match(lifecycle, /set deadline = p_new_deadline,[\s\S]*status = 'active'[\s\S]*where id = v_goal\.id/);
  assert.doesNotMatch(
    lifecycle.match(/create or replace function public\.extend_goal_deadline_v1[\s\S]*?\$\$;/)?.[0] ?? '',
    /insert into public\.goals/,
  );
});

test('New Phase is an owner-scoped atomic successor-and-archive operation', () => {
  const phaseFunction = lifecycle.match(/create or replace function public\.start_goal_new_phase_v1[\s\S]*?\$\$;/)?.[0] ?? '';
  assert.match(phaseFunction, /where id = p_previous_goal_id and user_id = auth\.uid\(\)[\s\S]*for update/);
  assert.match(phaseFunction, /previous_goal_id[\s\S]*v_previous\.id/);
  assert.match(phaseFunction, /insert into public\.goals/);
  assert.match(phaseFunction, /insert into public\.trackers/);
  assert.match(phaseFunction, /insert into public\.milestones/);
  assert.match(phaseFunction, /update public\.goals[\s\S]*set status = 'archived'[\s\S]*where id = v_previous\.id/);
  assert.doesNotMatch(phaseFunction, /delete from/);
});

test('expiration reconciliation is server-callable and owner scoped', () => {
  assert.match(lifecycle, /create or replace function public\.reconcile_goal_expiration_v1/);
  assert.match(lifecycle, /goal\.user_id = auth\.uid\(\)[\s\S]*goal\.status = 'active'[\s\S]*goal\.deadline < now\(\)/);
  assert.match(lifecycle, /grant execute on function public\.reconcile_goal_expiration_v1\(\) to authenticated/);
});

test('Entry saves retain requested historical links without permitting new inactive links', () => {
  const relationshipFunction = lifecycle.match(/create or replace function public\.replace_entry_relationships[\s\S]*?\$\$;/)?.[0] ?? '';
  assert.match(relationshipFunction, /goal\.status = 'active'[\s\S]*or exists \([\s\S]*public\.entry_goal_links existing/);
  assert.match(relationshipFunction, /existing\.entry_id = p_entry_id[\s\S]*existing\.goal_id = goal\.id/);
  assert.match(lifecycle, /Evidence reference is not present in note/);
});

test('deadline history is read-only to authenticated users and owner-scoped by RLS', () => {
  assert.match(lifecycle, /alter table public\.goal_deadline_history enable row level security/);
  assert.match(lifecycle, /using \(user_id = auth\.uid\(\)\)/);
  assert.match(lifecycle, /revoke insert, update, delete on public\.goal_deadline_history from anon, authenticated/);
});
