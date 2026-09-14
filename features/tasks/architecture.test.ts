import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (relative: string) => fs.readFileSync(path.join(root, relative), 'utf8');

test('Goal workspace uses one canonical Task surface below Intelligence', () => {
  const workspace = read('features/goals/components/GoalsWorkspace.tsx');
  const intelligence = workspace.indexOf('<InsightContextCard');
  const tasks = workspace.indexOf('<TasksPanel', intelligence);
  const detail = workspace.indexOf('<DetailTabs', tasks);
  assert.ok(intelligence >= 0 && tasks > intelligence && detail > tasks);
  assert.doesNotMatch(workspace, /<TrackersPanel/);
});

test('Today’s Focus reads canonical Task occurrences', () => {
  const dashboard = read('app/(app)/dashboard.tsx');
  assert.match(dashboard, /\/api\/tasks\/today/);
  assert.match(dashboard, /\/api\/task-occurrences\//);
  assert.doesNotMatch(dashboard, /\/api\/trackers\/due-today/);
  assert.doesNotMatch(dashboard, /nextTracker/);
});

test('normal legacy mutation endpoints are explicitly frozen', () => {
  for (const file of ['app/api/actions/index+api.ts', 'app/api/actions/[id]+api.ts', 'app/api/goals/complete-tracker+api.ts']) {
    const source = read(file);
    assert.match(source, /status: 410/);
    assert.doesNotMatch(source, /\.from\(['"](?:action_logs|trackers|tracker_logs)['"]\)[\s\S]{0,120}\.(?:insert|update|delete|upsert)/);
  }
});

test('the Tasks V2 cutover switch covers every canonical API surface', () => {
  for (const file of [
    'app/api/tasks/index+api.ts',
    'app/api/tasks/[id]+api.ts',
    'app/api/tasks/[id]/archive+api.ts',
    'app/api/tasks/[id]/schedule+api.ts',
    'app/api/tasks/log-completed+api.ts',
    'app/api/tasks/today+api.ts',
    'app/api/tasks/compare+api.ts',
    'app/api/task-occurrences/[id]+api.ts',
  ]) {
    assert.match(read(file), /FEATURES\.TASKS_V2_ENABLED/);
  }
});

test('Goal creation persists canonical Tasks and uses Task terminology', () => {
  const persistence = read('lib/db/goals.ts');
  const wizard = read('app/goals/create.tsx');
  assert.match(persistence, /rpc\('create_task_v1'/);
  assert.doesNotMatch(persistence, /from\(['"]trackers['"]\)[\s\S]{0,120}\.insert/);
  assert.match(wizard, /Your first Tasks/);
  assert.match(wizard, /Add custom Task/);
  assert.doesNotMatch(wizard, />TRACKERS</);
});

test('Task create and edit forms reset their draft state when they close', () => {
  const panel = read('features/tasks/components/TasksPanel.tsx');
  assert.match(panel, /onClose=\{\(\) => \{ setFormVisible\(false\); setEditing\(null\); \}\}/);
  assert.match(panel, /key=\{editing\?\.id \?\? 'new-task'\}/);
});

test('archived Task history is visibly read-only even on an active Goal', () => {
  const panel = read('features/tasks/components/TasksPanel.tsx');
  assert.match(panel, /mutationDisabled = readOnly \|\| task\.status === 'archived'/);
  assert.match(panel, /disabled=\{mutationDisabled \|\| !binary\}/);
});

test('unscheduled legacy definitions remain visible without fabricated occurrences', () => {
  const panel = read('features/tasks/components/TasksPanel.tsx');
  const backfill = read('supabase/migrations/048_tasks_legacy_backfill.sql');
  assert.match(panel, /ImportedTaskDefinitionRow/);
  assert.match(panel, /Imported baseline:/);
  assert.match(panel, /timing needs confirmation/);
  assert.doesNotMatch(backfill, /legacy-current-value:/);
});

test('New Phase migration clones Tasks without cloning legacy Trackers', () => {
  const migration = read('supabase/migrations/049_tasks_new_phase_continuity.sql');
  assert.match(migration, /insert into public\.tasks/);
  assert.match(migration, /perform public\.reconcile_task_occurrences_v1/);
  assert.doesNotMatch(migration, /insert into public\.trackers/);
});

test('release cutover atomically catches, verifies, and freezes legacy writes', () => {
  const backfill = read('supabase/migrations/048_tasks_legacy_backfill.sql');
  const cutover = read('supabase/migrations/050_tasks_release_cutover_controls.sql');
  const finalizer = cutover.slice(cutover.indexOf('create or replace function public.finalize_tasks_legacy_cutover_v1'));

  assert.match(backfill, /create or replace function public\.run_tasks_legacy_catchup_v1/);
  assert.match(backfill, /revoke all on function public\.run_tasks_legacy_catchup_v1\(\)[\s\S]*from public, anon, authenticated/);
  assert.match(backfill, /grant execute on function public\.run_tasks_legacy_catchup_v1\(\)[\s\S]*to service_role/);

  assert.match(cutover, /verify_tasks_legacy_cutover_v1/);
  assert.match(cutover, /unmapped_rows/);
  assert.match(cutover, /duplicate_mappings/);
  assert.doesNotMatch(cutover, /action_text|tracker\.title|tracker_log\.note/);
  assert.match(finalizer, /lock table public\.trackers, public\.tracker_logs, public\.action_logs/);
  assert.ok(finalizer.indexOf('run_tasks_legacy_catchup_v1') < finalizer.indexOf('freeze_tasks_legacy_writes_v1'));
  assert.match(cutover, /revoke insert, update, delete on table public\.trackers, public\.tracker_logs, public\.action_logs from authenticated/);
  assert.match(cutover, /grant insert, update, delete on table public\.trackers, public\.tracker_logs to authenticated/);
  assert.match(cutover, /grant insert, update on table public\.action_logs to authenticated/);
});
