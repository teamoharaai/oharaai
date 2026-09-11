import assert from 'node:assert/strict';
import test from 'node:test';
import { fetchAllPages, PAGE_SIZE } from './paginate.ts';
import { deriveTrackerPeriodState, type TrackerPeriodLog } from '../goals/tracker-period.ts';

type Row = { id: string; value: number };

function pagedReader(all: Row[]) {
  let calls = 0;
  const fetchPage = async (from: number, to: number) => {
    calls += 1;
    return { data: all.slice(from, to + 1), error: null as unknown };
  };
  return { fetchPage, calls: () => calls };
}

test('accumulates every page in order until a short page ends the loop', async () => {
  const all: Row[] = Array.from({ length: 1234 }, (_, i) => ({ id: String(i), value: i }));
  const { fetchPage } = pagedReader(all);
  const rows = await fetchAllPages(fetchPage);
  assert.equal(rows.length, 1234);
  assert.deepEqual(rows[0], { id: '0', value: 0 });
  assert.deepEqual(rows[1233], { id: '1233', value: 1233 });
});

test('reads one extra empty page when the total is an exact multiple of PAGE_SIZE', async () => {
  const all: Row[] = Array.from({ length: PAGE_SIZE * 2 }, (_, i) => ({ id: String(i), value: 1 }));
  const { fetchPage, calls } = pagedReader(all);
  const rows = await fetchAllPages(fetchPage);
  assert.equal(rows.length, PAGE_SIZE * 2);
  // Two full pages (each === PAGE_SIZE) can't signal the end; a 3rd short/empty page does.
  assert.equal(calls(), 3);
});

test('throws (does not swallow) a page error so a partial read never looks complete', async () => {
  const fetchPage = async () => ({ data: null, error: new Error('boom') });
  await assert.rejects(() => fetchAllPages(fetchPage), /boom/);
});

test('rejects an invalid page size', async () => {
  await assert.rejects(
    () => fetchAllPages(async () => ({ data: [], error: null }), 0),
    /positive integer/,
  );
});

test('a >1000-log goal paginates and sums to the correct final value', async () => {
  const asOf = new Date('2026-08-05T12:00:00.000Z');
  const total = 1500; // exceeds the implicit single-response row ceiling
  const all = Array.from({ length: total }, (_, i) => ({
    id: String(i),
    tracker_id: 't',
    value: 1,
    logged_at: '2026-08-05T10:00:00.000Z', // all inside the current daily UTC period
  }));

  const rows = await fetchAllPages<(typeof all)[number]>(async (from, to) => ({
    data: all.slice(from, to + 1),
    error: null,
  }));
  assert.equal(rows.length, total);

  const logs: TrackerPeriodLog[] = rows.map((r) => ({ value: r.value, loggedAt: new Date(r.logged_at) }));
  const below = deriveTrackerPeriodState(
    { type: 'counter', frequency: 'daily', targetValue: 9999 },
    logs,
    'UTC',
    asOf,
  )!;
  assert.equal(below.currentValue, total);
  assert.equal(below.isCompleted, false); // 1500 < 9999

  const met = deriveTrackerPeriodState(
    { type: 'counter', frequency: 'daily', targetValue: total },
    logs,
    'UTC',
    asOf,
  )!;
  assert.equal(met.currentValue, total);
  assert.equal(met.isCompleted, true);
});
