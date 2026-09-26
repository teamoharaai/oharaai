// Rollback-only preflight for the Goal migrations (TD-001). In ONE transaction it applies every local
// migration after --applied-through, runs the probes in scripts/goal-hosted-preflight/, prints hosted facts
// and ends with ROLLBACK. Nothing is kept: no schema change, no synthetic row, no migration-history row.
//
// Usage:
//   node scripts/test-manual-goal-hosted.mjs --project-ref <confirmed-ref> --applied-through 073   # hosted
//   node scripts/test-manual-goal-hosted.mjs --local --applied-through 073                          # kept db-chain cluster
//
// Hosted: the ref must match supabase/.temp/project-ref, the target must be that project's pooler, and hosted
// supabase_migrations.schema_migrations must list exactly the local migrations 001..<applied-through>.
// Local: GOAL_TEST_SOCKET/GOAL_TEST_PORT/GOAL_TEST_DB from `bash scripts/db-chain/run.sh --chain-only --keep
// --through <applied-through>`; OHARA_MIGRATIONS_DIR may point at a copy (e.g. with a seeded defect).
//
// Before 076, a read-only pre-check counts the Task-days 076 would abort on (TASK_OCCURRENCE_DAY_CONFLICTS).
// A non-zero count is reported, 076 and its probe are skipped, and the run exits 2 (BLOCKED).
import { readFileSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const probeDir = `${root}/scripts/goal-hosted-preflight`;
const arg = (name) => { const i = process.argv.indexOf(name); return i < 0 ? undefined : process.argv[i + 1]; };
const local = process.argv.includes('--local');
const through = arg('--applied-through');
if (!/^\d{3}$/.test(through ?? '')) throw Error('--applied-through NNN is required (the last migration the target already has)');

// Probes by migration. A probe runs whenever its migration is on the target after the pending ones apply,
// so already-applied migrations are re-checked against the new ones.
const PROBES = { '072': '072-manual-goal.sql', '074': '074-goal-card.sql', '075': '075-goal-work.sql', '076': '076-task-schedule-continuity.sql',
  '077': '077-note-evidence-synchronizer.sql' };
const PRECHECKS = { '076': '076-precheck.sql' };

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
  const expected = arg('--project-ref');
  const linked = readFileSync(`${root}/supabase/.temp/project-ref`, 'utf8').trim();
  if (!expected || expected !== linked) throw Error('Explicit confirmed project reference must match the linked project');
  const values = {};
  for (let line of readFileSync(`${root}/.env.local`, 'utf8').split(/\r?\n/)) {
    line = line.trim().replace(/^export\s+/, '');
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const i = line.indexOf('='); values[line.slice(0,i).trim()] = line.slice(i+1).trim().replace(/^(['"])(.*)\1$/, '$2');
  }
  const target = new URL(readFileSync(`${root}/supabase/.temp/pooler-url`, 'utf8').trim());
  if (decodeURIComponent(target.username) !== `postgres.${expected}` || !target.hostname.endsWith('.pooler.supabase.com')) throw Error('Unexpected database target');
  env = { ...process.env, PGHOST:target.hostname, PGPORT:target.port || '5432', PGDATABASE:target.pathname.slice(1), PGUSER:decodeURIComponent(target.username), PGPASSWORD:values.SUPABASE_DB_PASSWORD, PGSSLMODE:'require', PGCONNECT_TIMEOUT:'15' };
  label = `hosted ${expected}`;
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
const out = [
  'begin;',
  "set local lock_timeout = '5s';",
  "set local statement_timeout = '60s';",
  `\\echo 'preflight: ${label}; applied through ${through}; pending ${pending.map(version).join(', ')}'`,
  "select current_user, current_setting('server_version') as server_version;",
];
if (!local) {
  // The target's history must be exactly the local chain through --applied-through.
  const expected = JSON.stringify(applied.map((f) => [version(f), f.slice(4, -4)]));
  out.push(`do $$ declare actual jsonb; begin
  select coalesce(jsonb_agg(jsonb_build_array(version, name) order by version), '[]') into actual from supabase_migrations.schema_migrations;
  if actual is distinct from ${quote(expected)}::jsonb then raise exception 'PREFLIGHT_HISTORY_MISMATCH: target history differs from local 001..${through}: %', actual; end if;
end $$;`, `\\echo 'history: target has exactly local 001..${through}'`);
}
const gated = new Set();
for (const file of pending) {
  const v = version(file);
  if (PRECHECKS[v]) { out.push(probe(PRECHECKS[v]), `\\if :gate_${v}`); gated.add(v); }
  out.push(body(file), `\\echo 'applied ${file}'`);
  if (gated.has(v)) out.push('\\else', `\\echo 'BLOCKED: ${file} not applied; it would abort on the Task-days counted above'`, '\\endif');
}
for (const [v, name] of Object.entries(PROBES).sort()) {
  if (v > last) continue;
  if (gated.has(v)) out.push(`\\if :gate_${v}`);
  out.push(probe(name), `\\echo 'probe ${v} passed'`);
  if (gated.has(v)) out.push('\\endif');
}
// Prove the rollback from the server: after it, the preflight's transaction must report as aborted.
out.push(probe('facts.sql'), "\\echo 'PREFLIGHT_PROBES_DONE'", 'select pg_current_xact_id() as preflight_xid \\gset', 'rollback;',
  "select 'ROLLBACK verified: transaction ' || :'preflight_xid' || ' is ' || pg_xact_status(:'preflight_xid'::xid8) as rollback \\gset",
  '\\echo :rollback');

const result = spawnSync(process.env.GOAL_TEST_PSQL ?? 'psql', ['-X', '-q', '-v', 'ON_ERROR_STOP=1', '-P', 'pager=off'], {
  env, input: out.join('\n'), encoding: 'utf8', maxBuffer: 8 * 1024 * 1024,
});
process.stdout.write(result.stdout ?? '');
if (result.status !== 0) { console.error(result.stderr || result.error?.message || 'Preflight failed'); console.error(`FAIL: preflight on ${label}; the transaction was not committed`); process.exit(1); }
if (!result.stdout.includes('PREFLIGHT_PROBES_DONE') || !/^ROLLBACK verified: transaction \d+ is aborted$/m.test(result.stdout)) throw Error('No rollback confirmation');
const unprobed = pending.filter((f) => !PROBES[version(f)]);
if (unprobed.length) console.log(`NOTE: applied without a probe: ${unprobed.join(', ')}`);
if (/^BLOCKED:/m.test(result.stdout)) { console.log(`BLOCKED: preflight on ${label}; see the pre-check counts above. Rolled back.`); process.exit(2); }
console.log(`PASS: applied ${pending.map(version).join(', ')} on top of ${through}, probes ${Object.keys(PROBES).filter((v) => v <= last).join(', ')} passed; rolled back on ${label}`);
