import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { iosError, iosJSON, iosRequestContext } from './ios-contract.ts';

const root = process.cwd();
const fixture = (name: string) => JSON.parse(
  readFileSync(join(root, 'contracts', 'ios', 'v1', `${name}.json`), 'utf8'),
) as Record<string, any>;

test('request IDs are accepted only in the bounded safe format', () => {
  assert.equal(
    iosRequestContext(new Request('https://example.test', {
      headers: { 'X-Request-ID': 'ios.request-123:attempt' },
    })).requestId,
    'ios.request-123:attempt',
  );
  const rejected = iosRequestContext(new Request('https://example.test', {
    headers: { 'X-Request-ID': 'x'.repeat(129) },
  })).requestId;
  assert.match(rejected, /^[0-9a-f-]{36}$/i);
});

test('success and errors carry no-store request correlation', async () => {
  const context = { requestId: 'fixture-request' };
  const success = iosJSON(context, { data: { value: 1 } });
  assert.equal(success.headers.get('X-Request-ID'), context.requestId);
  assert.equal(success.headers.get('Cache-Control'), 'no-store');

  const response = iosError(
    context, 429, 'RATE_LIMITED', 'Wait before retrying', { retryAfterSeconds: 5 },
  );
  assert.equal(response.status, 429);
  assert.equal(response.headers.get('Retry-After'), '5');
  assert.deepEqual(await response.json(), {
    ok: false,
    data: null,
    error: { code: 'RATE_LIMITED', message: 'Wait before retrying' },
    requestId: context.requestId,
  });
});

test('v1 Momentum, goals, and Entries fixtures lock the native subset', () => {
  const momentum = fixture('momentum');
  assert.equal(momentum.request.path, '/api/momentum');
  assert.equal(momentum.response.body.data.goals[0].displayedValue, 62);

  const goals = fixture('goals');
  assert.equal(goals.request.body.origin, 'manual');
  assert.equal(goals.request.body.trackers[0].targetValue, 10);
  assert.equal(goals.response.body.data.goalId, '11111111-1111-4111-8111-111111111111');

  const entries = fixture('entries');
  assert.equal(entries.create.request.body.entryType, 'reflection');
  assert.equal(entries.create.request.body.clientRequestId, '33333333-3333-4333-8333-333333333333');
  assert.equal(entries.create.response.body.entry.brtCategory, 'rose');
});

test('latest committed migration and iOS-relevant owner policies stay covered', () => {
  const migrations = readdirSync(join(root, 'supabase', 'migrations')).sort();
  assert.equal(migrations.at(-1), '046_tracker_logs_period_index.sql');

  const migration = (name: string) => readFileSync(
    join(root, 'supabase', 'migrations', name), 'utf8',
  );
  const core = migration('001_core_schema_and_rls.sql');
  assert.match(core, /Users can read own profile[\s\S]*id = auth\.uid\(\)/);
  assert.match(core, /Users can select own goals[\s\S]*user_id = auth\.uid\(\)/);
  assert.match(core, /Users can update measurables for own goals[\s\S]*goal_id in[\s\S]*g\.user_id = auth\.uid\(\)/);
  assert.match(core, /Users can select own measurable logs[\s\S]*g\.user_id = auth\.uid\(\)/);

  const actions = migration('006_logging_and_rate_limiting.sql');
  assert.match(actions, /Users can update own action logs[\s\S]*user_id = auth\.uid\(\)[\s\S]*with check[\s\S]*g\.user_id = auth\.uid\(\)/);

  const entries = migration('036_entries_notes_reflections.sql');
  assert.match(entries, /Users can update own entries[\s\S]*using \(user_id = auth\.uid\(\)\) with check \(user_id = auth\.uid\(\)\)/);
  assert.match(entries, /Users can insert own entry goal links[\s\S]*e\.user_id = auth\.uid\(\)[\s\S]*g\.user_id = auth\.uid\(\)/);
  assert.match(entries, /Users can insert own reflection milestone links[\s\S]*e\.user_id = auth\.uid\(\)[\s\S]*m\.user_id = auth\.uid\(\)/);

  const entryV4 = migration('045_entries_brt_idempotent_create.sql');
  assert.match(entryV4, /v_owner_id uuid := auth\.uid\(\)/);
  assert.match(entryV4, /where user_id = v_owner_id and client_request_id = p_client_request_id/);
  assert.match(entryV4, /grant execute on function public\.save_entry_v4[\s\S]*to authenticated/);

  for (const file of ['038_momentum_foundation.sql', '040_momentum_v1.sql']) {
    const sql = migration(file);
    assert.match(sql, /for select using \(user_id = auth\.uid\(\)\)/);
    assert.match(sql, /auth\.role\(\) <> 'service_role'/);
    assert.match(sql, /to service_role/);
  }
});
