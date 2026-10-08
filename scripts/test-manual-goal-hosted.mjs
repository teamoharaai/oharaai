// Preflight and apply for the pending migrations (TD-001). In ONE transaction it applies every local migration
// after --applied-through, runs the probes in scripts/goal-hosted-preflight/ and prints hosted facts.
//   Preflight (default): ends with ROLLBACK. Nothing is kept: no schema change, no synthetic row, no history row.
//   --apply: fingerprints existing Goal/Task rows first, runs the probes inside a savepoint it rolls back, aborts
//   if any existing row changed, records the migrations in supabase_migrations.schema_migrations (version, name,
//   and the whole file as the single `statements` element, as 072 was recorded), notifies PostgREST to reload its
//   schema cache, and COMMITs. The server then confirms the commit, the new history and the recorded statements.
//   Any failure before COMMIT leaves the target untouched.
//
// Usage:
//   node scripts/test-manual-goal-hosted.mjs --project-ref <confirmed-ref> --applied-through 073 [--apply]  # hosted
//   node scripts/test-manual-goal-hosted.mjs --local --applied-through 073 [--apply]                        # kept db-chain cluster
//
// Guards, before anything is applied: hosted, the ref must match supabase/.temp/project-ref and the target
// must be that project's pooler; always, the target's supabase_migrations.schema_migrations must list exactly
// the local migrations 001..<applied-through>, and each pending migration must be one BEGIN ... COMMIT.
// Local: GOAL_TEST_SOCKET/GOAL_TEST_PORT/GOAL_TEST_DB from `bash scripts/db-chain/run.sh --chain-only --keep
// --through <applied-through>`; OHARA_MIGRATIONS_DIR may point at a copy (e.g. with a seeded defect).
//
// Before 076, a read-only pre-check counts the Task-days 076 would abort on (TASK_OCCURRENCE_DAY_CONFLICTS).
// Preflight: a non-zero count is reported, 076 and its probe are skipped, and the run exits 2 (BLOCKED).
// --apply: any conflict, or any redundant row 076 would cancel, stops before 076 and commits nothing (exit 2).
import { readFileSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolveHostedTarget } from './db-chain/hosted-target.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const probeDir = `${root}/scripts/goal-hosted-preflight`;
const arg = (name) => { const i = process.argv.indexOf(name); return i < 0 ? undefined : process.argv[i + 1]; };
const local = process.argv.includes('--local');
const apply = process.argv.includes('--apply');
const through = arg('--applied-through');
if (!/^\d{3}$/.test(through ?? '')) throw Error('--applied-through NNN is required (the last migration the target already has)');

// Probes by migration. A probe runs whenever its migration is on the target after the pending ones apply,
// so already-applied migrations are re-checked against the new ones.
const PROBES = { '072': '072-manual-goal.sql', '074': '074-goal-card.sql', '075': '075-goal-work.sql', '076': '076-task-schedule-continuity.sql',
  '077': '077-note-evidence-synchronizer.sql', '078': '078-operation-ledger.sql', '080': '080-goal-events.sql',
  '081': '081-goal-work-desktop.sql', '082': '082-shared-entry-reliability.sql',
  '083': '083-domain-computation-jobs.sql', '084': '084-sticky-retirement.sql',
  '085': '085-project-task-execution.sql', '086': '086-echo-mirror.sql',
  '087': '087-notes-library-folders.sql', '088': '088-project-member-self-leave.sql',
  '090': '090-calendar-external-links.sql' };
const PRECHECKS = { '076': '076-precheck.sql', '086': '086-precheck.sql' };

// Target -----------------------------------------------------------------------
let env, label, migrationsDir = `${root}/supabase/migrations`;
if (local) {
  const socket = process.env.GOAL_TEST_SOCKET;
  if (!socket?.startsWith('/tmp/ohara-goal-')) throw Error('Explicit disposable GOAL_TEST_SOCKET required for --local');
  if (process.env.OHARA_MIGRATIONS_DIR) migrationsDir = process.env.OHARA_MIGRATIONS_DIR;
  env = { ...process.env, PGHOST: socket, PGPORT: process.env.GOAL_TEST_PORT ?? '55450', PGDATABASE: process.env.GOAL_TEST_DB ?? 'chain', PGUSER: 'postgres' };
  label = `local ${socket} (${env.PGDATABASE})`;
} else {
  if (process.env.OHARA_MIGRATIONS_DIR) throw Error('OHARA_MIGRATIONS_DIR is only allowed with --local');
  ({ env, label } = resolveHostedTarget(root, arg('--project-ref')));
}

// Migrations -------------------------------------------------------------------
const files = readdirSync(migrationsDir).filter((f) => /^\d{3}_.+\.sql$/.test(f)).sort();
const version = (f) => f.slice(0, 3);
const applied = files.filter((f) => version(f) <= through);
const pending = files.filter((f) => version(f) > through);
if (!applied.length || version(applied.at(-1)) !== through) throw Error(`No local migration ${through}`);
if (!pending.length) throw Error(`Nothing after ${through} to preflight`);
// Each migration must be exactly one BEGIN ... COMMIT with nothing that cannot run inside a transaction,
// so its body can join the preflight's transaction.
const body = (file) => {
  const text = readFileSync(`${migrationsDir}/${file}`, 'utf8');
  const control = [...text.matchAll(/^\s*(begin|commit|rollback|start\s+transaction|end\s+transaction|savepoint|release)\b\s*;\s*$/gim)];
  if (control.length !== 2 || !/^begin$/i.test(control[0][1]) || !/^commit$/i.test(control[1][1])) throw Error(`${file}: expected exactly one BEGIN; ... COMMIT;`);
  const before = text.slice(0, control[0].index), after = text.slice(control[1].index + control[1][0].length);
  if (before.replace(/--[^\n]*/g, '').trim() || after.replace(/--[^\n]*/g, '').trim()) throw Error(`${file}: statements outside its transaction`);
  if (/\bconcurrently\b|^\s*vacuum\b|^\s*alter\s+system\b/im.test(text)) throw Error(`${file}: contains a statement that cannot run in a transaction`);
  return text.slice(control[0].index + control[0][0].length, control[1].index);
};
const probe = (name) => readFileSync(`${probeDir}/${name}`, 'utf8');
const quote = (s) => `'${s.replaceAll("'", "''")}'`;

// Script -----------------------------------------------------------------------
const last = version(pending.at(-1));
const mode = apply ? 'apply' : 'preflight';
// The target's history must be exactly these local migrations, by version and name.
const historyGuard = (list, code, what) => {
  const expected = JSON.stringify(list.map((f) => [version(f), f.slice(4, -4)]));
  return `do $$ declare actual jsonb; begin
  select coalesce(jsonb_agg(jsonb_build_array(version, name) order by version), '[]') into actual from supabase_migrations.schema_migrations;
  if actual is distinct from ${quote(expected)}::jsonb then raise exception '${code}: target history differs from ${what}: %', actual; end if;
end $$;`;
};
const out = [
  'begin;',
  "set local lock_timeout = '5s';",
  "set local statement_timeout = '60s';",
  `\\echo '${mode}: ${label}; applied through ${through}; pending ${pending.map(version).join(', ')}'`,
  "select current_user, current_setting('server_version') as server_version;",
  historyGuard(applied, 'PREFLIGHT_HISTORY_MISMATCH', `local 001..${through}`), `\\echo 'history: target has exactly local 001..${through}'`,
];
if (apply) out.push(probe('invariants-before.sql'));
const gated = new Set();
for (const file of pending) {
  const v = version(file);
  if (PRECHECKS[v] && apply) {
    // Apply is all or nothing: stop before anything is applied unless the pre-check is clean. Quitting with the
    // transaction open ends the session, and the server rolls it back.
    out.push(probe(PRECHECKS[v]), `\\if :clean_${v}`, '\\else',
      `\\echo 'BLOCKED: ${file} is not clean (see the pre-check counts above); nothing committed'`, '\\quit', '\\endif');
  } else if (PRECHECKS[v]) { out.push(probe(PRECHECKS[v]), `\\if :gate_${v}`); gated.add(v); }
  out.push(body(file), `\\echo 'applied ${file}'`);
  if (gated.has(v)) out.push('\\else', `\\echo 'BLOCKED: ${file} not applied; it would abort on the Task-days counted above'`, '\\endif');
}
// Probes write synthetic rows; when applying, they run in a savepoint that is rolled back before COMMIT.
if (apply) out.push('savepoint probes;');
for (const [v, name] of Object.entries(PROBES).sort()) {
  if (v > last) continue;
  if (gated.has(v)) out.push(`\\if :gate_${v}`);
  out.push(probe(name), `\\echo 'probe ${v} passed'`);
  if (gated.has(v)) out.push('\\endif');
}
if (apply) out.push('rollback to savepoint probes;', "\\echo 'probes rolled back'");
out.push(probe('facts.sql'), "\\echo 'PREFLIGHT_PROBES_DONE'", 'select pg_current_xact_id() as preflight_xid \\gset');
if (apply) {
  // History rows carry the whole migration file as the single `statements` element: byte-exact, no SQL splitting.
  // This is how 072 was recorded on hosted (read 2026-09-27); `supabase db push` rows split per statement instead.
  const source = (f) => readFileSync(`${migrationsDir}/${f}`, 'utf8');
  const rows = pending.map((f) => `(${quote(version(f))}, ${quote(f.slice(4, -4))}, array[${quote(source(f))}])`).join(',\n');
  const digests = JSON.stringify(Object.fromEntries(pending.map((f) => [version(f), createHash('md5').update(source(f)).digest('hex')])));
  // Commit, then prove it from the server: the transaction is committed, the history is the full local chain,
  // and each new row's statements are exactly its local file.
  out.push(probe('invariants-after.sql'),
    `insert into supabase_migrations.schema_migrations(version, name, statements) values ${rows};`,
    "notify pgrst, 'reload schema';",
    'commit;',
    "select 'COMMIT verified: transaction ' || :'preflight_xid' || ' is ' || pg_xact_status(:'preflight_xid'::xid8) as outcome \\gset",
    '\\echo :outcome',
    historyGuard([...applied, ...pending], 'APPLY_HISTORY_MISMATCH', `local 001..${last} after commit`),
    `\\echo 'history: target now has exactly local 001..${last}'`,
    `do $$ begin
  if exists (select 1 from jsonb_each_text(${quote(digests)}::jsonb) d(v, digest)
             left join supabase_migrations.schema_migrations m on m.version = d.v
             where m.statements is null or cardinality(m.statements) <> 1 or md5(m.statements[1]) <> d.digest) then
    raise exception 'APPLY_HISTORY_STATEMENTS_MISMATCH: recorded statements differ from the local migration files'; end if;
end $$;`,
    `\\echo 'history: recorded statements match the local files'`);
} else {
  // Prove the rollback from the server: after it, the preflight's transaction must report as aborted.
  out.push('rollback;',
    "select 'ROLLBACK verified: transaction ' || :'preflight_xid' || ' is ' || pg_xact_status(:'preflight_xid'::xid8) as outcome \\gset",
    '\\echo :outcome');
}

const result = spawnSync(process.env.GOAL_TEST_PSQL ?? 'psql', ['-X', '-q', '-v', 'ON_ERROR_STOP=1', '-P', 'pager=off'], {
  env, input: out.join('\n'), encoding: 'utf8', maxBuffer: 8 * 1024 * 1024,
});
process.stdout.write(result.stdout ?? '');
const committed = /^COMMIT verified: transaction \d+ is committed$/m.test(result.stdout ?? '');
if (result.status !== 0) {
  console.error(result.stderr || result.error?.message || `${mode} failed`);
  // Only the post-commit checks can fail after COMMIT; say so rather than claiming nothing was kept.
  console.error(committed ? `FAIL: ${mode} on ${label} COMMITTED, but a post-commit check failed; inspect the target`
    : `FAIL: ${mode} on ${label}; the transaction was not committed`);
  process.exit(1);
}
if (/^BLOCKED:/m.test(result.stdout)) {
  console.log(`BLOCKED: ${mode} on ${label}; see the pre-check counts above. ${apply ? 'Nothing committed.' : 'Rolled back.'}`);
  process.exit(2);
}
const outcome = apply ? committed : /^ROLLBACK verified: transaction \d+ is aborted$/m.test(result.stdout);
if (!result.stdout.includes('PREFLIGHT_PROBES_DONE') || !outcome) throw Error(`No ${apply ? 'commit' : 'rollback'} confirmation`);
const unprobed = pending.filter((f) => !PROBES[version(f)]);
if (unprobed.length) console.log(`NOTE: applied without a probe: ${unprobed.join(', ')}`);
const probed = Object.keys(PROBES).filter((v) => v <= last).join(', ');
console.log(apply
  ? `PASS: applied and COMMITTED ${pending.map(version).join(', ')} on top of ${through}; existing rows unchanged, probes ${probed} passed and rolled back, history now 001..${last}, PostgREST notified; on ${label}`
  : `PASS: applied ${pending.map(version).join(', ')} on top of ${through}, probes ${probed} passed; rolled back on ${label}`);
