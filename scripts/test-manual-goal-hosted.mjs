// Full hosted-schema preflight. All schema changes and synthetic rows roll back.
// Usage: node scripts/test-manual-goal-hosted.mjs --project-ref <confirmed-dev-ref>
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const expected = process.argv[process.argv.indexOf('--project-ref') + 1];
const linked = readFileSync(`${root}/supabase/.temp/project-ref`, 'utf8').trim();
if (!process.argv.includes('--project-ref') || expected !== linked) throw Error('Explicit confirmed development project reference must match the linked project');
const values = {};
for (let line of readFileSync(`${root}/.env.local`, 'utf8').split(/\r?\n/)) {
  line = line.trim().replace(/^export\s+/, '');
  if (!line || line.startsWith('#') || !line.includes('=')) continue;
  const i = line.indexOf('='); values[line.slice(0,i).trim()] = line.slice(i+1).trim().replace(/^(['"])(.*)\1$/, '$2');
}
const target = new URL(readFileSync(`${root}/supabase/.temp/pooler-url`, 'utf8').trim());
if (decodeURIComponent(target.username) !== `postgres.${expected}` || !target.hostname.endsWith('.pooler.supabase.com')) throw Error('Unexpected database target');
const migration = readFileSync(`${root}/supabase/migrations/072_manual_goal_foundation.sql`, 'utf8');
if (!/commit;\s*$/.test(migration)) throw Error('Expected one transactional migration');
const sql = migration.replace(/commit;\s*$/, '') + readFileSync(`${root}/scripts/manual-goal-hosted-probe.sql`, 'utf8');
const result = spawnSync(process.env.GOAL_TEST_PSQL ?? 'psql', ['-X','-v','ON_ERROR_STOP=1'], {
  env: { ...process.env, PGHOST:target.hostname, PGPORT:target.port || '5432', PGDATABASE:target.pathname.slice(1), PGUSER:decodeURIComponent(target.username), PGPASSWORD:values.SUPABASE_DB_PASSWORD, PGSSLMODE:'require', PGCONNECT_TIMEOUT:'15' },
  input:sql, encoding:'utf8', maxBuffer:1024*1024,
});
if (result.status !== 0) { console.error(result.stderr || result.error?.message || 'Preflight failed'); process.exit(1); }
if (!result.stdout.includes('ROLLBACK')) throw Error('No rollback confirmation');
console.log(`PASS: migration, hosted privileges/triggers, creation/replay/privacy/header/list/account cascade; rolled back on ${expected}`);
