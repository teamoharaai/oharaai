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
  const homeSummaryRoute = read('app/api/home/summary+api.ts');
  // Home is now Circles: Today's Focus surfaces this week's canonical Task
  // count (task_occurrences), and the interactive today-task check-off moved to
  // the Goals workspace (TasksPanel, asserted above). Since Stage 2 the count
  // arrives via the Home aggregator (`useHomeSummary` → `/api/home/summary`),
  // which reads canonical occurrences through `fetchWeeklyTaskCountsByGoal`.
  // Home must still never read legacy trackers.
  assert.match(dashboard, /useHomeSummary/);
  assert.match(homeSummaryRoute, /fetchWeeklyTaskCountsByGoal/);
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

test('Task form drives scheduling from the weekday strip, with inferred completion (Goal Detail Redesign)', () => {
  const panel = read('features/tasks/components/TasksPanel.tsx');
  // The weekday strip is the schedule (no days = Once, all seven = Every day);
  // the retired Once/Daily/On-set-days cadence chips and the Completion toggle are gone.
  assert.match(panel, /TASK_WEEKDAYS\.map/);
  assert.match(panel, />Every day</);
  assert.doesNotMatch(panel, /label: 'On set days'/);
  assert.doesNotMatch(panel, /Every 2 weeks/);
  assert.doesNotMatch(panel, /Optional due date/);
  assert.doesNotMatch(panel, /Optional time · HH:MM/);
  // Completion mode is inferred from an optional count — the Add-Task form no longer
  // renders a "Completion" field label or a Check off / Quantity toggle.
  assert.doesNotMatch(panel, /<Typography variant="field-label">Completion<\/Typography>/);
  assert.match(panel, /placeholder="Quantity"/);
  assert.match(panel, /placeholder="Units"/);
});

test('the scope organizer is the sole plan filter; the Later/Someday lanes were removed', () => {
  const panel = read('features/tasks/components/TasksPanel.tsx');
  // Phase 2 (To-Do × Metric unification): one time-scope selector over the unified
  // plan, not the old Today/Upcoming/Completions/Anytime lanes. Overdue is pinned;
  // Upcoming is scope-relative. The Later/Someday collapsibles were later removed —
  // the scope selector alone governs what's in view (out-of-scope work is not
  // re-surfaced in a separate lane).
  assert.match(panel, /PLAN_SCOPES\.map/);
  assert.match(panel, />Overdue</);
  assert.match(panel, /Upcoming · \$\{scopeMeta\.upcomingLabel\}/);
  assert.doesNotMatch(panel, /Someday \(/);
  assert.doesNotMatch(panel, /Later \(/);
  assert.doesNotMatch(panel, />Completions</);
  assert.doesNotMatch(panel, />Anytime</);
  // The retroactive "Log completed" form was dead code and has been deleted.
  assert.doesNotMatch(panel, /\+ Log completed/);
  assert.doesNotMatch(panel, /LogCompletedForm/);
});

test('Task create and edit forms reset their draft state when they close', () => {
  const panel = read('features/tasks/components/TasksPanel.tsx');
  assert.match(panel, /onClose=\{\(\) => \{ setFormVisible\(false\); setEditing\(null\); \}\}/);
  assert.match(panel, /key=\{`\$\{formVisible \? 'open' : 'closed'\}:\$\{editing\?\.id \?\? 'new-task'\}`\}/);
});

test('archived Task history is visibly read-only even on an active Goal', () => {
  const panel = read('features/tasks/components/TasksPanel.tsx');
  assert.match(panel, /mutationDisabled = readOnly \|\| task\.status === 'archived'/);
  assert.match(panel, /disabled=\{mutationDisabled \|\| !binary\}/);
});

test('the imported legacy-definition row was removed with the Someday section', () => {
  const panel = read('features/tasks/components/TasksPanel.tsx');
  const backfill = read('supabase/migrations/049_tasks_legacy_backfill.sql');
  // Removing the Later/Someday collapsibles also removed ImportedTaskDefinitionRow,
  // the only surface for untimed legacy definitions — untimed imports no longer
  // render in the panel. The backfill still never fabricates a current value.
  assert.doesNotMatch(panel, /ImportedTaskDefinitionRow/);
  assert.doesNotMatch(backfill, /legacy-current-value:/);
});

test('New Phase migration clones Tasks without cloning legacy Trackers', () => {
  const migration = read('supabase/migrations/050_tasks_new_phase_continuity.sql');
  assert.match(migration, /insert into public\.tasks/);
  assert.match(migration, /perform public\.reconcile_task_occurrences_v1/);
  assert.doesNotMatch(migration, /insert into public\.trackers/);
});

test('release cutover atomically catches, verifies, and freezes legacy writes', () => {
  const backfill = read('supabase/migrations/049_tasks_legacy_backfill.sql');
  const cutover = read('supabase/migrations/051_tasks_release_cutover_controls.sql');
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
