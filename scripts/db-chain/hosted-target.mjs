// The one place that resolves the hosted (production) target. Every hosted script uses it, so the guards
// can't drift: the ref must be given explicitly and match supabase/.temp/project-ref, the database must be that
// project's pooler, and the API must be that project's supabase.co host. Nothing here opens a connection.
import { readFileSync } from 'node:fs';

export function readEnvLocal(root) {
  const values = {};
  for (let line of readFileSync(`${root}/.env.local`, 'utf8').split(/\r?\n/)) {
    line = line.trim().replace(/^export\s+/, '');
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const i = line.indexOf('='); values[line.slice(0,i).trim()] = line.slice(i+1).trim().replace(/^(['"])(.*)\1$/, '$2');
  }
  return values;
}

// Returns psql environment (`env`), a `label`, and the checked Supabase origin plus `values` from .env.local.
export function resolveHostedTarget(root, expected) {
  const linked = readFileSync(`${root}/supabase/.temp/project-ref`, 'utf8').trim();
  if (!expected || expected !== linked) throw Error('Explicit confirmed project reference must match the linked project');
  const values = readEnvLocal(root);
  const target = new URL(readFileSync(`${root}/supabase/.temp/pooler-url`, 'utf8').trim());
  if (decodeURIComponent(target.username) !== `postgres.${expected}` || !target.hostname.endsWith('.pooler.supabase.com')) throw Error('Unexpected database target');
  const env = { ...process.env, PGHOST:target.hostname, PGPORT:target.port || '5432', PGDATABASE:target.pathname.slice(1), PGUSER:decodeURIComponent(target.username), PGPASSWORD:values.SUPABASE_DB_PASSWORD, PGSSLMODE:'require', PGCONNECT_TIMEOUT:'15' };
  const supabaseURL = values.EXPO_PUBLIC_SUPABASE_URL ? new URL(values.EXPO_PUBLIC_SUPABASE_URL) : null;
  const apiOrigin = supabaseURL?.protocol === 'https:' && supabaseURL.hostname === `${expected}.supabase.co` ? supabaseURL.origin : null;
  return { env, label: `hosted ${expected}`, apiOrigin, values };
}
