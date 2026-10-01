import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const goalVault = read('features/goals/components/GoalVault.tsx');
const projectVault = read('features/projects/components/ProjectVaultWorkspace.tsx');
const projectWorkspace = read('app/(app)/projects/[id].tsx');
const goalWorkspace = read('features/goals/components/GoalsWorkspace.tsx');
const goalDetail = read('features/goals/hooks/useGoalDetail.ts');
const vaultReads = read('lib/db/vaults.ts');
const projectVaultApi = read('app/api/projects/[projectId]/vault+api.ts');
const goalVaultApi = read('app/api/vaults/[goalId]+api.ts');
const itemApi = read('app/api/vaults/items/[itemId]+api.ts');
const migration = read('supabase/migrations/084_retire_sticky_notes.sql');

test('active Goal and Project surfaces expose only canonical Vault categories', () => {
  assert.match(goalVault, /'all' \| 'notes' \| 'reflections' \| 'sources'/);
  for (const surface of [goalVault, projectVault, projectWorkspace, goalWorkspace]) {
    assert.doesNotMatch(surface, /Add Sticky Note|Project Sticky Note|StickyNotesPanel|title="Sticky Notes"/);
  }
  assert.doesNotMatch(goalDetail, /createGoalNote|updateGoalNote|deleteGoalNote|uploadGoalNotePhoto|GoalNoteFolder/);
  assert.match(goalVault, /item\.contentKind !== 'sticky_note'/);
});

test('runtime reads hide archived sticky rows and mutation APIs fail closed', () => {
  assert.match(vaultReads, /\.neq\('content_kind', 'sticky_note'\)/);
  assert.match(projectVaultApi, /\.neq\('content_kind', 'sticky_note'\)/);
  assert.match(projectVaultApi, /raw\.contentKind === 'sticky_note'[\s\S]*status: 410/);
  assert.match(goalVaultApi, /body\.contentKind === 'sticky_note'[\s\S]*status: 410/);
  assert.match(itemApi, /existingItem\.contentKind === 'sticky_note'[\s\S]*status: 410/);
});

test('migration 084 archives without deleting or converting historical content', () => {
  assert.match(migration, /prevent_retired_sticky_note_write_v1/);
  assert.match(migration, /revoke insert, update, delete on table public\.vault_note_folders/);
  assert.doesNotMatch(migration, /drop policy if exists "Users can read own goal note photos"/);
  assert.doesNotMatch(migration, /delete\s+from|drop\s+table|update\s+public\.vault_items\s+set\s+content_kind/i);
});
