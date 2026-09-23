import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const migration = readFileSync(resolve(process.cwd(), 'supabase/migrations/071_projects_v1_foundation.sql'), 'utf8');
const api = readFileSync(resolve(process.cwd(), 'app/api/projects/[projectId]/vault+api.ts'), 'utf8');

test('Project Vault has one exclusive same-owner parent', () => {
  assert.match(migration, /vaults_exactly_one_parent_check/);
  assert.match(migration, /goal_id is not null.*project_id is not null/s);
  assert.match(migration, /vaults_project_id_unique_idx/);
  assert.match(migration, /Vault owner must match its parent owner/);
});

test('Goal association ownership and reassignment are database enforced', () => {
  assert.match(migration, /goals_validate_project_owner_v1/);
  assert.match(migration, /Goal and Project must have the same owner/);
  assert.match(migration, /p_allow_reassignment/);
  assert.match(migration, /already belongs to another Project/);
});

test('Project association history is append-only and owner-readable', () => {
  assert.match(migration, /create table public\.project_goal_events/);
  assert.match(migration, /revoke insert, update, delete.*authenticated/s);
  assert.match(migration, /Owners can read Project Goal events/);
});

test('Project Vault aggregation authenticates before reading titles or counts', () => {
  assert.match(api, /withAuth\(handleGet\)/);
  assert.match(api, /getOrCreateProjectVaultForUser/);
  assert.match(api, /eq\('user_id', auth\.userId\)/);
  assert.match(api, /directProjectItem/);
  assert.match(api, /origins/);
});
