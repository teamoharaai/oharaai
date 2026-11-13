import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { MomentumHomeSummary } from './types.ts';
import { publishCurrentMomentumV11Summary, restoreClosedMomentumBaseline } from './services/momentum-service.ts';

const summary = (value: number) => ({
  algorithmVersion: 'ohara-momentum-v1.1', asOf: '2026-11-06T12:00:00Z',
  periodState: 'provisional', weekStart: '2026-11-02', currentValue: value,
  goals: [], history: [], trendLabels: [], trendPoints: [],
}) as unknown as MomentumHomeSummary;

function fixture(value: number, projection: unknown = summary(value), race = false) {
  const row: Record<string, unknown> = {user_id:'owner', current_value:value, current_summary:projection, current_week_start:'2026-11-02', updated_at:'2026-11-06T12:00:00Z'};
  const writes: Record<string, unknown>[] = [];
  const db = {from(table: string) {
    assert.equal(table, 'momentum_profiles', 'repair must never touch historical tables');
    let patch: Record<string,unknown>|undefined;
    const filters: Array<[string,unknown]> = [];
    const query = {
      select() { return query; },
      eq(key: string, value: unknown) { filters.push([key,value]); return query; },
      update(value: Record<string,unknown>) { patch=value; return query; },
      async upsert(value: Record<string,unknown>) { writes.push(value);Object.assign(row,value);return {error:null}; },
      async maybeSingle() {
        if (patch && race) row.updated_at='concurrent-write';
        const matches=filters.every(([key,value])=>row[key]===value);
        if (patch && matches) { writes.push(patch); Object.assign(row,patch); }
        return { data: matches ? {...row} : null, error:null };
      },
    };
    return query;
  }} as unknown as SupabaseClient;
  return {db,row,writes};
}

test('provisional publication preserves the scalar closed-week baseline across rollover', async () => {
  const f=fixture(28.5185, summary(28.518518518518515));
  await restoreClosedMomentumBaseline(f.db,'owner',0);
  assert.equal(f.row.current_value,0);
  assert.deepEqual(f.writes,[{current_value:0}]);
  // Model the unchanged trusted closed publisher's optimistic baseline check.
  assert.equal(f.row.current_value,0);
  f.row.current_value=29;
  await publishCurrentMomentumV11Summary(f.db,'owner',summary(42),'a'.repeat(64));
  assert.equal(f.row.current_value,29);
  assert.equal((f.row.current_summary as MomentumHomeSummary).currentValue,42);
  assert.equal(Object.hasOwn(f.writes[1],'current_value'),false);
  await restoreClosedMomentumBaseline(f.db,'owner',29);
  assert.equal(f.writes.length,2);
});

test('baseline repair does not disguise unexplained changes or unrecognized projections', async () => {
  for (const projection of [null, summary(40), {...summary(20),periodState:'closed'}, {...summary(20),weekStart:'2026-10-26'}, {...summary(20),algorithmVersion:'momentum-v1.0'}]) {
    const f=fixture(20,projection);
    await restoreClosedMomentumBaseline(f.db,'owner',5);
    assert.equal(f.row.current_value,20);
    assert.equal(f.writes.length,0);
  }
});

test('concurrent profile changes fail closed and remain retryable', async () => {
  const f=fixture(28.5,summary(28.5),true);
  await assert.rejects(()=>restoreClosedMomentumBaseline(f.db,'owner',0),/changed during repair/);
  assert.equal(f.row.current_value,28.5);
  assert.equal(f.writes.length,0);
});
