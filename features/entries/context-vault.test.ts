import assert from 'node:assert/strict';
import test from 'node:test';
import { readContextVaultEntries } from './services/context-vault.ts';

// Models PostgREST's already RLS-filtered results, not an authorization engine.
// The disposable SQL suite independently exercises the actual policies.
function fixture(options: { fail?: string; denied?: boolean; many?: boolean } = {}) {
  const calls: Array<{ table: string; filters: Array<[string, unknown]> }> = [];
  const entry = (id: string, project_id: string | null = null) => ({ id, entry_type: 'note', title: id, user_id: 'viewer', archived: false, project_id, updated_at: '2026-10-22', created_at: '2026-10-22', plain_text: 'x'.repeat(600) });
  const tables: Record<string, any[]> = {
    projects: options.denied ? [] : [{ id: 'p', title: 'Project', status: 'active' }],
    goals: [{ id: 'g1', title: 'First Goal', project_id: 'p' }, { id: 'g2', title: 'Second Goal', project_id: 'p' }, { id: 'detached', title: 'Detached', project_id: null }],
    entry_goal_links: [{ entry_id: 'both', goal_id: 'g1' }, { entry_id: 'both', goal_id: 'g2' }, { entry_id: 'inherited', goal_id: 'g2' }, { entry_id: 'hidden', goal_id: 'g1' }, { entry_id: 'detached', goal_id: 'detached' }],
    entries: [entry('both', 'p'), entry('inherited'), entry('detached'), ...(options.many ? Array.from({ length: 250 }, (_, i) => entry(`direct-${i}`, 'p')) : [])],
  };
  const db = { from(table: string) {
    const filters: Array<[string, any]> = [];
    let start = 0, end = Infinity, single = false;
    const query: any = {
      select() { return query; }, order() { return query; },
      eq(key: string, value: unknown) { filters.push([key, value]); return query; },
      in(key: string, value: unknown[]) { filters.push([key, value]); return query; },
      range(a: number, b: number) { start = a; end = b; return query; },
      maybeSingle() { single = true; return query; },
      then(resolve: (value: unknown) => void) {
        calls.push({ table, filters });
        if (options.fail === table) return Promise.resolve(resolve({ data: null, error: new Error('Unavailable') }));
        const rows = tables[table].filter((row) => filters.every(([key, value]) => Array.isArray(value) ? value.includes(row[key]) : row[key] === value)).slice(start, end + 1);
        return Promise.resolve(resolve({ data: single ? rows[0] ?? null : rows, error: null }));
      },
    }; return query;
  } };
  return { db: db as never, calls };
}

test('Project union deduplicates direct/multi-Goal Entries and uses authorized current origins only', async () => {
  const { db, calls } = fixture();
  const result = await readContextVaultEntries(db, { type: 'project', id: 'p' });
  assert.equal(result.incomplete, false);
  assert.deepEqual(result.entries.map((e) => e.id), ['both', 'inherited']);
  assert.equal(result.entries[0].goals.length, 2);
  assert.equal(result.entries[0].project?.id, 'p');
  assert.equal(result.entries[1].project, null);
  assert.equal(result.entries[0].plainText.length, 500);
  assert.ok(calls.filter((c) => c.table === 'entries').every((c) => c.filters.some(([key]) => key === 'project_id' || key === 'id')));
});
test('failure of Goal/link scope preserves direct results and marks them incomplete', async () => {
  const { db } = fixture({ fail: 'entry_goal_links' });
  const result = await readContextVaultEntries(db, { type: 'project', id: 'p' });
  assert.equal(result.incomplete, true);
  assert.deepEqual(result.entries.map((e) => e.id), ['both']);
});
test('denied Project does not query Entries or links', async () => {
  const { db, calls } = fixture({ denied: true });
  await assert.rejects(readContextVaultEntries(db, { type: 'project', id: 'p' }), /access has changed/);
  assert.deepEqual(calls.map((c) => c.table), ['projects']);
});
test('pagination goes beyond a page without duplicate rows or misleading totals', async () => {
  const { db } = fixture({ many: true });
  const result = await readContextVaultEntries(db, { type: 'project', id: 'p' });
  assert.equal(result.entries.length, 252);
  assert.equal(result.incomplete, false);
});
test('Goal read is scoped, omits detached associations and never reads a full Entry library', async () => {
  const { db } = fixture();
  const result = await readContextVaultEntries(db, { type: 'goal', id: 'g2' });
  assert.deepEqual(result.entries.map((e) => e.id), ['both', 'inherited']);
  assert.ok(result.entries.every((e) => e.goals.length === 1 && e.goals[0].id === 'g2'));
});
