import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/036_entries_notes_reflections.sql'),
  'utf8',
);
const relationshipFix = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/037_fix_entry_category_link_source.sql'),
  'utf8',
);

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
