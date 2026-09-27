import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const migration = readFileSync(resolve(process.cwd(), 'supabase/migrations/071_projects_v1_foundation.sql'), 'utf8');
const collaboration = readFileSync(resolve(process.cwd(), 'supabase/migrations/073_projects_v1_1_collaboration.sql'), 'utf8');
const chatMigration = readFileSync(resolve(process.cwd(), 'supabase/migrations/079_project_chat.sql'), 'utf8');
const api = readFileSync(resolve(process.cwd(), 'app/api/projects/[projectId]/vault+api.ts'), 'utf8');
const auth = readFileSync(resolve(process.cwd(), 'lib/api/auth.ts'), 'utf8');
const apiClient = readFileSync(resolve(process.cwd(), 'lib/api/client.ts'), 'utf8');

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
  assert.match(api, /createAuthedClient\(auth\.accessToken\)/);
  assert.match(api, /project_has_capability_v11/);
  assert.match(api, /const visibility = isOwner/);
  assert.match(api, /: 'vault_members'/);
  assert.match(api, /directProjectItem/);
  assert.match(api, /origins/);
});

test('Project API auth does not disguise missing or stale sessions as GET 404s', () => {
  assert.match(api, /withAuth\(handleGet\)/);
  assert.match(auth, /status: 401/);
  assert.match(auth, /status: 503/);
  assert.match(apiClient, /response\.status === 401/);
  assert.doesNotMatch(apiClient, /response\.status === 404/);
});

test('V1.1 enforces one capability architecture and the three-person boundary', () => {
  assert.match(collaboration, /project_role_has_capability_v11/);
  assert.match(collaboration, /project_members_enforce_limit_v11/);
  assert.match(collaboration, /pg_advisory_xact_lock/);
  assert.match(collaboration, /if v_count >= 3/);
  assert.match(collaboration, /status in \('pending','accepted','declined','revoked','expired'\)/);
});

test('private Project content is denied unless sharing is explicit', () => {
  assert.match(collaboration, /project_share_scope in \('private','project','guide'\)/);
  assert.match(collaboration, /project_share_scope <> 'private'/);
  assert.match(collaboration, /visibility='vault_members'/);
  assert.match(collaboration, /Project members can read shared Entry Goal links/);
  assert.match(collaboration, /Private remains the default and is never inferred/);
});

test('responsibility and contextual comments validate canonical Project targets', () => {
  assert.match(collaboration, /goals_validate_project_lead_v11/);
  assert.match(collaboration, /tasks_validate_assignee_v11/);
  assert.match(collaboration, /milestones_validate_responsibility_v11/);
  assert.match(collaboration, /validate_project_comment_target_v11/);
  assert.match(collaboration, /edit_project_comment_v11/);
  assert.match(collaboration, /author_id=auth\.uid\(\)/);
  assert.match(collaboration, /set body=btrim\(p_body\),edited_at=now\(\)/);
  assert.match(collaboration, /Comment must be between 1 and 2000 characters/);
  assert.match(collaboration, /project_activity_events/);
});

test('Project Chat is member-scoped, author-mutable, and body-safe in activity', () => {
  assert.match(chatMigration, /create table public\.project_chat_messages/);
  assert.match(chatMigration, /project_has_capability_v11\(project_id, auth\.uid\(\), 'chat'\)/);
  assert.match(chatMigration, /author_id = auth\.uid\(\)/);
  assert.match(chatMigration, /create_project_chat_message_v11/);
  assert.match(chatMigration, /edit_project_chat_message_v11/);
  assert.match(chatMigration, /delete_project_chat_message_v11/);
  assert.match(chatMigration, /supabase_realtime/);
  assert.doesNotMatch(chatMigration, /jsonb_build_object\('body'/);
});
