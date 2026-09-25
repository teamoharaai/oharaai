import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { manualGoalV1, isCalendarDate } from './manual-create-v1.ts';
const base = { title: 'Café', category: 'Life & Relationships' };
const vectors = JSON.parse(readFileSync(new URL('./manual-create-v1.fixtures.json', import.meta.url), 'utf8'));
for (const v of vectors) test(v.id, () => {
  const result = manualGoalV1(v.input);
  assert.equal(result.canonical, v.canonical);
  assert.equal(result.digest, v.digest);
});
test('exact taxonomy, Unicode scalar limits and strict fields', () => {
  for (const category of ['Health & Fitness', 'Work & Money', 'Learning & Creativity', 'Life & Relationships']) assert.equal(manualGoalV1({ ...base, category }).fields.category, category);
  for (const category of ['growth', 'health', 'finance', 'career', 'creative', 'education', 'relationships', 'life & relationships', ' Life & Relationships']) assert.throws(() => manualGoalV1({ ...base, category }));
  assert.doesNotThrow(() => manualGoalV1({ ...base, title: '😀'.repeat(200), description: 'é'.repeat(2000) }));
  for (const extra of [{ title: '😀'.repeat(201) }, { description: 'é'.repeat(2001) }, { title: '\ud800' }, { description: '\udc00' }, { title: 'x\0y' }, { title: 2 }, { endDate: '' }, { ownerId: null }, { trackers: [] }, { status: 'active' }]) assert.throws(() => manualGoalV1({ ...base, ...extra }));
});
test('specified trim set only and optional equivalence', () => {
  const cps = [9,10,11,12,13,32,133,160,5760,...Array.from({length:11},(_,i)=>8192+i),8232,8233,8239,8287,12288];
  for (const cp of cps) assert.equal(manualGoalV1({...base,title:String.fromCodePoint(cp)+'Café'+String.fromCodePoint(cp)}).digest, vectors[0].digest);
  for (const cp of [0x200b,0xfeff]) assert.notEqual(manualGoalV1({...base,title:String.fromCodePoint(cp)+'Café'}).digest, vectors[0].digest);
  assert.equal(manualGoalV1({...base,description:null,endDate:null}).digest, vectors[0].digest);
  const input = {...base, title:' Cafe\u0301 ',description:'a\u2028b\u2029c'};
  const before = JSON.stringify(input); assert.ok(manualGoalV1(input).canonical.includes('a\u2028b\u2029c')); assert.equal(JSON.stringify(input),before);
});
test('Gregorian dates without clock or timezone conversion', () => {
  for (const d of ['0001-01-01','9999-12-31','2000-02-29','2028-02-29','1990-01-01']) assert.ok(isCalendarDate(d));
  for (const d of ['0000-01-01','1900-02-29','2026-02-29','2026-04-31','2026-13-01',' 2026-01-01','2026-01-01T00:00:00Z','２０２６-01-01']) assert.ok(!isCalendarDate(d));
});
