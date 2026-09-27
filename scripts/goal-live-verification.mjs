// Live native↔API↔database verification lifecycle for the Goal contracts (manual-v1, card-v1, work-v1).
// Every command talks to the hosted (production) project: each run needs Justin's explicit approval.
//
//   provision  checks the target (admission closed, verification_only, empty allowlist, no leftover
//              @goal-e2e.ohara.test accounts); creates two fresh synthetic accounts through the Auth admin API;
//              allow-lists ONLY the owner and opens admission (enabled = true, verification_only stays true, so no
//              other account is admitted); writes a private copy of the built .xctestrun with the credentials in
//              the OharaAITests environment. The password exists only in memory and in that 0600 file.
//   cleanup    prints the synthetic owners' row counts (evidence), closes admission, deletes ONLY the recorded
//              synthetic accounts (their rows cascade), deletes the private .xctestrun and verifies nothing remains.
//
// Usage:
//   node scripts/goal-live-verification.mjs provision --project-ref <ref> --xctestrun <built .xctestrun> [--out <dir>]
//   node scripts/goal-live-verification.mjs cleanup   --project-ref <ref> [--out <dir>]
// Run state (ids, emails, file paths; never the password) is kept in <out>/run.json, default /tmp/ohara-goal-live.
import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveHostedTarget } from './db-chain/hosted-target.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const SUFFIX = '@goal-e2e.ohara.test';
const arg = (name) => { const i = process.argv.indexOf(name); return i < 0 ? undefined : process.argv[i + 1]; };
const command = process.argv[2];
if (!['provision', 'cleanup'].includes(command)) throw Error('Usage: goal-live-verification.mjs provision|cleanup --project-ref <ref> ...');
const out = arg('--out') ?? '/tmp/ohara-goal-live';
const statePath = join(out, 'run.json');
const { env, label, apiOrigin, values } = resolveHostedTarget(root, arg('--project-ref'));
const serviceKey = values.SUPABASE_SERVICE_ROLE_KEY;
if (!apiOrigin || !serviceKey) throw Error('The linked project\'s Supabase URL and service role key are required in .env.local');
const uuid = (v) => { if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v)) throw Error('Unexpected user id'); return v; };

function psql(sql) {
  const result = spawnSync(process.env.GOAL_TEST_PSQL ?? 'psql', ['-X', '-q', '-At', '-F', '|', '-v', 'ON_ERROR_STOP=1'], { input: sql, env, encoding: 'utf8' });
  if (result.status !== 0) throw Error(`psql on ${label} failed: ${result.stderr || result.error?.message}`);
  return result.stdout.trim();
}
async function admin(method, path, body) {
  const response = await fetch(`${apiOrigin}/auth/v1/admin/${path}`, {
    method, headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  if (!response.ok) throw Error(`Auth admin ${method} ${path.split('/')[0]} failed: HTTP ${response.status}`);
  return text ? JSON.parse(text) : null;
}
const saveState = (state) => { writeFileSync(statePath, JSON.stringify(state, null, 2) + '\n', { mode: 0o600 }); chmodSync(statePath, 0o600); };
const admissionState = () => {
  const [enabled, verificationOnly, allowlisted, leftovers] = psql(`select a.enabled, a.verification_only,
    (select count(*) from goal_private.verification_owners), (select count(*) from auth.users where email like '%${SUFFIX}')
    from goal_private.admission a;`).split('|');
  return { enabled: enabled === 't', verificationOnly: verificationOnly === 't', allowlisted: Number(allowlisted), leftovers: Number(leftovers) };
};

if (command === 'provision') {
  const xctestrun = arg('--xctestrun');
  if (!xctestrun?.endsWith('.xctestrun') || !existsSync(xctestrun)) throw Error('--xctestrun <path to the built .xctestrun> is required');
  if (existsSync(statePath)) throw Error(`${statePath} exists: clean up the previous run first`);
  const before = admissionState();
  console.log(`BEFORE on ${label}: ${JSON.stringify(before)}`);
  if (before.enabled || !before.verificationOnly || before.allowlisted || before.leftovers) {
    throw Error('REFUSED: expected admission closed, verification_only, an empty allowlist and no leftover synthetic accounts');
  }
  mkdirSync(out, { recursive: true, mode: 0o700 });
  const run = `live-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${randomBytes(4).toString('hex')}`;
  const password = `${randomBytes(24).toString('base64url')}Aa1!`;
  const state = { label, run, users: {}, xctestrun: null };
  saveState(state);
  for (const role of ['owner', 'other']) {
    const email = `${run}-${role}${SUFFIX}`;
    const user = await admin('POST', 'users', { email, password, email_confirm: true });
    state.users[role] = { id: uuid(user.id), email };
    saveState(state); // recorded before the next step, so cleanup can always find a partial run
    console.log(`CREATED ${role}: ${user.id} ${email}`);
  }
  const owner = state.users.owner.id;
  console.log(psql(`begin;
    select 1 from goal_private.admission for update;
    do $$ begin
      if (select email from auth.users where id = '${owner}') is distinct from '${state.users.owner.email}' then raise exception 'LIVE_OWNER_MISMATCH'; end if;
      if not (select verification_only from goal_private.admission) then raise exception 'LIVE_NOT_VERIFICATION_ONLY'; end if;
      if exists (select 1 from goal_private.verification_owners) then raise exception 'LIVE_ALLOWLIST_NOT_EMPTY'; end if;
    end $$;
    insert into goal_private.verification_owners(owner_id) values ('${owner}');
    update goal_private.admission set enabled = true where verification_only;
    select 'ADMISSION ' || enabled || ' verification_only ' || verification_only || ' allowlist ' ||
      (select string_agg(owner_id::text, ',') from goal_private.verification_owners) from goal_private.admission;
    commit;`));
  // A private copy of the built .xctestrun next to it (its paths are relative to the Products directory).
  const plist = JSON.parse(spawnSync('plutil', ['-convert', 'json', '-o', '-', xctestrun], { encoding: 'utf8' }).stdout);
  const live = { OHARA_LIVE_GOAL_TEST: '1', OHARA_LIVE_GOAL_CREATE: '1', OHARA_LIVE_GOAL_OWNER_EMAIL: state.users.owner.email,
    OHARA_LIVE_GOAL_OTHER_EMAIL: state.users.other.email, OHARA_LIVE_GOAL_PASSWORD: password };
  let targets = 0;
  for (const config of plist.TestConfigurations ?? []) for (const target of config.TestTargets ?? []) {
    if (target.BlueprintName !== 'OharaAITests') continue;
    target.EnvironmentVariables = { ...target.EnvironmentVariables, ...live };
    target.TestingEnvironmentVariables = { ...target.TestingEnvironmentVariables, ...live };
    targets++;
  }
  if (!targets) throw Error('No OharaAITests target in the .xctestrun');
  state.xctestrun = join(dirname(xctestrun), `ohara-${run}.xctestrun`);
  saveState(state);
  const json = join(out, 'xctestrun.json');
  writeFileSync(json, JSON.stringify(plist), { mode: 0o600 });
  const converted = spawnSync('plutil', ['-convert', 'xml1', '-o', state.xctestrun, json], { encoding: 'utf8' });
  rmSync(json, { force: true });
  if (converted.status !== 0) throw Error('Could not write the private .xctestrun');
  chmodSync(state.xctestrun, 0o600);
  console.log(`XCTESTRUN (private, 0600): ${state.xctestrun}`);
  console.log(`PROVISIONED on ${label}: run ${run}; only ${owner} is admitted. Run cleanup when the tests finish.`);
}

if (command === 'cleanup') {
  if (!existsSync(statePath)) throw Error(`No ${statePath}: nothing recorded to clean up`);
  const state = JSON.parse(readFileSync(statePath, 'utf8'));
  if (state.label !== label) throw Error('The recorded run belongs to another target');
  const users = Object.values(state.users);
  for (const user of users) if (!user.email.endsWith(SUFFIX)) throw Error('Refusing a non-synthetic account');
  const ids = users.map((u) => `'${uuid(u.id)}'`).join(',') || 'null';
  const counts = () => psql(`select 'auth_users ' || (select count(*) from auth.users where id in (${ids}))
    || ' profiles ' || (select count(*) from public.profiles where id in (${ids}))
    || ' goals ' || (select count(*) from public.goals where user_id in (${ids}))
    || ' tasks ' || (select count(*) from public.tasks where user_id in (${ids}))
    || ' milestones ' || (select count(*) from public.milestones where user_id in (${ids}))
    || ' manual_operations ' || (select count(*) from goal_private.operations where owner_id in (${ids}))
    || ' goal_mutations ' || (select count(*) from goal_private.goal_mutations where owner_id in (${ids}))
    || ' work_mutations ' || (select count(*) from goal_private.work_mutations where owner_id in (${ids}))
    || ' allowlisted ' || (select count(*) from goal_private.verification_owners where owner_id in (${ids}));`);
  console.log(`EVIDENCE before cleanup: ${counts()}`);
  console.log(psql(`begin; update goal_private.admission set enabled = false;
    select 'ADMISSION ' || enabled || ' verification_only ' || verification_only from goal_private.admission; commit;`));
  for (const user of users) {
    const [email] = psql(`select email from auth.users where id = '${uuid(user.id)}';`).split('\n');
    if (!email) { console.log(`ALREADY GONE: ${user.id}`); continue; }
    if (email !== user.email) throw Error(`Refusing ${user.id}: its email no longer matches the recorded synthetic account`);
    await admin('DELETE', `users/${user.id}`);
    console.log(`DELETED: ${user.id} ${user.email}`);
  }
  if (state.xctestrun) { rmSync(state.xctestrun, { force: true }); console.log(`REMOVED private xctestrun: ${state.xctestrun}`); }
  const after = counts();
  const final = admissionState();
  console.log(`AFTER cleanup: ${after}`);
  console.log(`ADMISSION after: ${JSON.stringify(final)}`);
  if (/[1-9]/.test(after.replace(/[a-z_]+ /g, '')) || final.enabled || !final.verificationOnly || final.allowlisted || final.leftovers) {
    throw Error('CLEANUP INCOMPLETE: inspect the target');
  }
  rmSync(statePath, { force: true });
  console.log(`CLEAN on ${label}: admission closed, allowlist empty, no synthetic accounts or rows remain.`);
}
