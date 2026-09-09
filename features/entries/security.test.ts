import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { parseEntryDraft } from './validation.ts';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/036_entries_notes_reflections.sql'),
  'utf8',
);
const relationshipFix = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/037_fix_entry_category_link_source.sql'),
  'utf8',
);
const editorV2 = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/042_notes_editor_v2.sql'),
  'utf8',
);
const echoV1 = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/044_echo_v1_project_links.sql'),
  'utf8',
);
const entriesBrt = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/045_entries_brt_idempotent_create.sql'),
  'utf8',
);
const entriesDb = readFileSync(resolve(process.cwd(), 'lib/db/entries.ts'), 'utf8');

test('enables RLS for entries and every relationship table', () => {
  for (const table of [
    'entries',
    'entry_goal_links',
    'entry_category_links',
    'reflection_milestone_links',
  ]) {
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security;`));
  }
});

test('all owner policies and save functions derive scope from auth.uid()', () => {
  assert.match(migration, /user_id = auth\.uid\(\)/);
  assert.match(migration, /where e\.id = entry_id and e\.user_id = auth\.uid\(\)/);
  assert.match(migration, /where g\.id = goal_id and g\.user_id = auth\.uid\(\)/);
  assert.match(migration, /where m\.id = milestone_id and m\.user_id = auth\.uid\(\)/);
  assert.match(migration, /grant execute on function public\.save_entry[\s\S]*to authenticated;/);
});

test('relationship replacement is transactional and deduplicated', () => {
  assert.match(migration, /create or replace function public\.replace_entry_relationships/);
  assert.match(migration, /on conflict \(entry_id, goal_id\) do nothing;/);
  assert.match(migration, /on conflict \(entry_id, category_id\) do nothing;/);
  assert.match(migration, /on conflict \(entry_id, milestone_id\) do nothing;/);
});

test('category-only relationships persist their required link source', () => {
  assert.match(
    relationshipFix,
    /select p_entry_id, linked_category_id, 'category_only'/,
  );
});

test('note images are private and storage paths are owner-scoped', () => {
  assert.match(editorV2, /'note-images',[\s\S]*false,[\s\S]*10485760/);
  assert.match(editorV2, /storage\.foldername\(name\)\)\[1\] = auth\.uid\(\)::text/g);
});

test('note progress evidence is server validated and cannot mutate Momentum directly', () => {
  assert.match(editorV2, /create or replace function public\.sync_entry_goal_progress_evidence[\s\S]*security definer/);
  assert.match(editorV2, /where e\.id = p_entry_id and e\.user_id = v_owner_id and e\.entry_type = 'note'/);
  assert.match(editorV2, /where g\.id = v_goal_id and g\.user_id = v_owner_id and g\.status <> 'archived'/);
  assert.match(editorV2, /Evidence reference is not present in note/);
  assert.match(editorV2, /v_completed := v_source_type = 'checkbox' and v_document_checkbox_completed/);
  assert.match(editorV2, /revoke all on function public\.sync_entry_goal_progress_evidence\(uuid, jsonb\)[\s\S]*from public, anon, authenticated/);
  assert.doesNotMatch(editorV2, /grant execute on function public\.sync_entry_goal_progress_evidence/);
  assert.match(editorV2, /revoke insert, update, delete on public\.entry_goal_progress_events from anon, authenticated/);
  assert.doesNotMatch(editorV2, /update public\.momentum_|insert into public\.momentum_/);
});

test('only explicit completion transitions create canonical progress events', () => {
  assert.match(editorV2, /if v_completed and coalesce\(v_previous_completed, false\) = false then/);
  assert.match(editorV2, /'note\.progress_evidence_completed'/);
  assert.match(editorV2, /completionSequence/);
});

test('schema V2 saves are atomic and revision checked', () => {
  assert.match(editorV2, /create or replace function public\.save_entry_v2/);
  assert.match(editorV2, /select content_version into v_current_version[\s\S]*for update/);
  assert.match(editorV2, /Expected content version is required/);
  assert.match(editorV2, /v_current_version <> p_expected_content_version/);
  assert.match(editorV2, /v_entry_id := public\.save_entry\([\s\S]*perform public\.sync_entry_goal_progress_evidence/);
});

test('Echo V1 Project organization is additive, owner-scoped, and atomic', () => {
  assert.match(echoV1, /add column project_id uuid references public\.projects\(id\) on delete set null/);
  assert.match(echoV1, /create or replace function public\.save_entry_v3[\s\S]*security definer/);
  assert.match(echoV1, /p\.user_id = auth\.uid\(\)[\s\S]*p\.status <> 'archived'/);
  assert.match(echoV1, /v_entry_id := public\.save_entry_v2\([\s\S]*set project_id = p_project_id/);
  assert.match(echoV1, /revoke all on function public\.save_entry_v3[\s\S]*grant execute[\s\S]*to authenticated/);
  assert.doesNotMatch(echoV1, /insert into public\.momentum_|update public\.momentum_/);
});

test('canonical Entries owns one constrained BRT value and an owner-scoped create key', () => {
  assert.match(entriesBrt, /brt_category is null or brt_category in \('bud', 'rose', 'thorn'\)/);
  assert.match(entriesBrt, /check \(entry_type = 'reflection' or brt_category is null\)/);
  assert.match(entriesBrt, /on public\.entries \(user_id, client_request_id\)/);
  assert.match(entriesBrt, /entry\.id = echo\.id[\s\S]*entry\.user_id = echo\.user_id/);
  assert.match(entriesBrt, /old\.entry_type = 'reflection' and new\.entry_type = 'note'[\s\S]*new\.brt_category := null/);
  assert.match(entriesBrt, /create or replace function public\.save_entry_v4/);
  assert.match(entriesBrt, /v_entry_id := public\.save_entry_v3\([\s\S]*p_project_id/);
  assert.match(entriesBrt, /where user_id = v_owner_id and client_request_id = p_client_request_id/);
  assert.match(entriesDb, /db\.rpc\('save_entry_v4'/);
  assert.match(entriesDb, /p_brt_category_provided:/);
  assert.match(entriesDb, /p_client_request_id:/);
});

test('entry validation accepts only canonical BRT and UUID request values', () => {
  const valid = {
    entryType: 'reflection',
    title: '',
    content: { type: 'doc', blocks: [{ id: 'body', type: 'paragraph', text: 'A thought' }] },
    plainText: 'A thought',
    brtCategory: 'bud',
    clientRequestId: '9e90f104-df1e-45cb-87e6-5d8ee762981a',
    relationships: { goalIds: [], categoryIds: [], milestoneIds: [] },
  };
  assert.equal(parseEntryDraft(valid).brtCategory, 'bud');
  assert.equal(parseEntryDraft(valid).clientRequestId, valid.clientRequestId);
  assert.throws(() => parseEntryDraft({ ...valid, brtCategory: 'growth' }), /brtCategory is invalid/);
  assert.throws(
    () => parseEntryDraft({ ...valid, entryType: 'note' }),
    /brtCategory is invalid for non-reflection entries/,
  );
  assert.throws(() => parseEntryDraft({ ...valid, clientRequestId: 'retry-1' }), /clientRequestId is invalid/);
});
