// Migration 072 integration against an explicitly supplied disposable Unix-socket PostgreSQL cluster.
// Run with `npm run test:goals:db`: the full supabase/migrations chain on a Supabase-shaped database.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
const socket=process.env.GOAL_TEST_SOCKET;
if (!socket?.startsWith('/tmp/ohara-goal-')) throw Error('Explicit disposable GOAL_TEST_SOCKET required');
const psql=process.env.GOAL_TEST_PSQL ?? '/opt/homebrew/opt/postgresql@17/bin/psql';
const args=['-h',socket,'-p',process.env.GOAL_TEST_PORT ?? '55450','-U','postgres','-d',process.env.GOAL_TEST_DB ?? 'postgres','-v','ON_ERROR_STOP=1','-Atq'];
const owner='11111111-1111-4111-8111-111111111111', other='22222222-2222-4222-8222-222222222222';
const sql=s=>execFileSync(psql,args,{input:s,encoding:'utf8'}).trim();
const literal=x=>"'"+JSON.stringify(x).replaceAll("'","''")+"'::jsonb";
const call=(action,p={},who=owner)=>JSON.parse(sql(`set role authenticated;set request.jwt.claim.sub='${who}';select public.goal_manual_v1('${action}',${literal(p)});`));
const asyncSQL=s=>new Promise((resolve,reject)=>{const p=spawn(psql,args);let out='',err='';p.stdout.on('data',x=>out+=x);p.stderr.on('data',x=>err+=x);p.on('exit',code=>code?reject(Error(err)):resolve(out.trim()));p.stdin.end(s);});
const vectors=JSON.parse(readFileSync(new URL('./manual-create-v1.fixtures.json',import.meta.url)));
let n=0;const id=()=>`aaaaaaaa-aaaa-4aaa-8aaa-${String(++n).padStart(12,'0')}`;
const binding=(operationId,v=vectors[0])=>({operationId,operationType:'goal.create.manual',contractVersion:1,payloadDigest:v.digest});
const submit=(operationId,v=vectors[0])=>({operationId,operationType:'goal.create.manual',contractVersion:1,fields:v.input});
// auth.users' first column is instance_id, and signup (008/028) creates the profile (other defaults to UTC).
sql(`insert into auth.users(id) values('${owner}'),('${other}') on conflict do nothing;update public.profiles set timezone='America/New_York' where id='${owner}';`);
test('SQL canonicalization independently matches all RB4 vectors',()=>{
  for(const v of vectors) assert.equal(sql(`select goal_private.digest(goal_private.fields(${literal(v.input)}));`),v.digest,v.id);
});
test('SQL trim set and strict dates agree with the shared validator',()=>{
  for(const cp of [9,10,11,12,13,32,133,160,5760,...Array.from({length:11},(_,i)=>8192+i),8232,8233,8239,8287,12288]){
    const input={...vectors[0].input,title:String.fromCodePoint(cp)+'Café'+String.fromCodePoint(cp)};
    assert.equal(sql(`select goal_private.digest(goal_private.fields(${literal(input)}));`),vectors[0].digest);
  }
  assert.equal(sql(`select goal_private.fields(${literal({...vectors[0].input,title:'v'})})->>'title';`),'v');
  for(const endDate of ['1900-02-29','0000-01-01','2026-04-31',' 2026-01-01','2026-01-01T00:00:00Z']) assert.throws(()=>sql(`select goal_private.fields(${literal({...vectors[0].input,endDate})});`));
});
test('admission off is explicit; no registration or content write',()=>{
  const op=id();assert.equal(call('register',binding(op)).error.code,'CREATION_UNAVAILABLE');
  assert.equal(call('lookup',{operationId:op}).error.code,'HISTORY_UNAVAILABLE');
  sql(`insert into goal_private.verification_owners values('${owner}');update goal_private.admission set enabled=true;`); // ONLY this disposable fixture enables it.
});
test('verification admission excludes existing non-test owners',()=>{
  assert.equal(call('capabilities',{},other).data.creationEnabled,false);
  assert.equal(call('register',binding(id()),other).error.code,'CREATION_UNAVAILABLE');
});
test('owner authorization, same-ID replay, mismatch, privacy and no date conversion',()=>{
  const op=id();assert.equal(call('register',binding(op)).data.state,'registered');
  const result=call('submit',submit(op));assert.equal(result.data.state,'committed');
  assert.deepEqual(call('submit',submit(op)).data,result.data);
  assert.equal(call('lookup',{operationId:op},other).error.code,'HISTORY_UNAVAILABLE');
  assert.equal(call('submit',submit(op,vectors[11])).error.code,'OPERATION_PAYLOAD_MISMATCH');
  assert.equal(sql(`select count(*) from public.goals where creation_operation_id='${op}' and visibility='private' and is_private and deadline is null and end_date_state='no_date' and progress=0 and not ai_generated and project_id is null;`),'1');
  const detail=call('header',{goalId:result.data.goalId});assert.equal(detail.data.header.dateState,'no_date');
  assert.equal(call('header',{goalId:result.data.goalId},other).error.code,'GOAL_UNAVAILABLE');
  assert.equal(call('close',{operationId:op}).data.state,'committed');
});
test('missing close tombstone fences delayed registration and submit',()=>{
  const op=id();assert.equal(call('close',{operationId:op}).data.state,'not_committed');
  assert.equal(call('register',binding(op)).data.state,'not_committed');
  assert.equal(call('submit',submit(op)).data.state,'not_committed');
});
test('dated context revision is immutable; profile errors do not affect undated saves',()=>{
  const op=id();const ctx=call('context').data;assert.equal(ctx.state,'available');
  call('register',{...binding(op,vectors[7]),reviewToken:ctx.reviewToken});
  sql(`update public.profiles set timezone='Asia/Tokyo' where id='${owner}';`);
  const result=call('submit',submit(op,vectors[7]));assert.equal(result.data.state,'not_committed');assert.equal(result.data.reason,'DATE_CONTEXT_CHANGED');
  const op2=id();const ctx2=call('context').data;call('register',{...binding(op2,vectors[7]),reviewToken:ctx2.reviewToken});
  const dated=call('submit',submit(op2,vectors[7]));assert.equal(dated.data.state,'committed');
  assert.equal(call('header',{goalId:dated.data.goalId}).data.header.endDate,'2028-02-29');
  sql(`delete from public.profiles where id='${owner}';`);
  assert.equal(call('submit',submit(op2,vectors[7])).data.state,'committed');
  const op3=id();call('register',binding(op3));assert.equal(call('submit',submit(op3)).data.state,'committed');
});
test('SQL direct callers cannot bypass supported fields; legacy dates preserved',()=>{
  const op=id();call('register',binding(op));
  assert.equal(call('submit',{...submit(op),fields:{...vectors[0].input,trackers:[]}}).error.code,'INVALID_FIELD');
  assert.equal(call('lookup',{operationId:op}).data.state,'registered');
  sql(`insert into public.goals(id,user_id,title,category,deadline) values('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','${owner}','Legacy','Learning & Creativity','2020-02-02T17:43:00+09');`);
  assert.equal(call('header',{goalId:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'}).data.header.dateState,'needs_review');
  assert.equal(sql("select deadline at time zone 'UTC' from public.goals where id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';"),'2020-02-02 08:43:00');
  assert.throws(()=>sql(`set role authenticated;set request.jwt.claim.sub='${owner}';update public.goals set deadline=null where date_contract_version=1;`));
});
test('bounded recovery includes unacknowledged terminal outcomes and owner-bound cursors',()=>{
  const first=call('discover',{limit:2});assert.equal(first.data.items.length,2);assert.ok(first.data.hasMore);assert.ok(first.data.hasOutstandingAtBarrier);
  assert.equal(call('discover',{cursor:first.data.nextCursor},other).error.code,'CURSOR_EXPIRED');
  const ids=new Set(first.data.items.map(x=>x.operationId));let cursor=first.data.nextCursor;
  while(cursor){const p=call('discover',{limit:2,cursor}).data;for(const r of p.items){assert.ok(!ids.has(r.operationId));ids.add(r.operationId);}cursor=p.nextCursor;}
  for(const operationId of ids){let r=call('lookup',{operationId}).data;if(r.state==='registered')r=call('close',{operationId}).data;call('ack',{operationId,revision:r.revision});}
  assert.equal(call('discover').data.hasOutstandingAtBarrier,false);
  assert.equal(call('list',{limit:1}).data.items.length,1);
});
test('parallel submissions serialize; close races cannot produce two outcomes',async()=>{
  const op=id();call('register',binding(op));
  const cmd=`set role authenticated;set request.jwt.claim.sub='${owner}';select public.goal_manual_v1('submit',${literal(submit(op))});`;
  const results=await Promise.all([asyncSQL(cmd),asyncSQL(cmd)]);
  assert.equal(JSON.parse(results[0]).data.goalId,JSON.parse(results[1]).data.goalId);
  assert.equal(sql(`select count(*) from public.goals where creation_operation_id='${op}'`),'1');
  const raced=id();call('register',binding(raced));
  const prefix=`set role authenticated;set request.jwt.claim.sub='${owner}';`;
  const [a,b]=await Promise.all([asyncSQL(prefix+`select public.goal_manual_v1('submit',${literal(submit(raced))});`),asyncSQL(prefix+`select public.goal_manual_v1('close',${literal({operationId:raced})});`)]);
  assert.equal(JSON.parse(a).data.state,JSON.parse(b).data.state);
});
test('transaction rollback leaves registered receipt and no orphan Goal; rollback admission retains recovery',()=>{
  const op=id();call('register',binding(op));
  sql(`begin;set local role authenticated;set local request.jwt.claim.sub='${owner}';select public.goal_manual_v1('submit',${literal(submit(op))});rollback;`);
  assert.equal(call('lookup',{operationId:op}).data.state,'registered');assert.equal(sql(`select count(*) from public.goals where creation_operation_id='${op}'`),'0');
  sql('update goal_private.admission set enabled=false;');
  assert.equal(call('submit',submit(op)).error.code,'CREATION_UNAVAILABLE');assert.equal(call('close',{operationId:op}).data.state,'not_committed');
});

test('account deletion ends receipt retention without blocking the FK cascade',()=>{
  sql(`delete from auth.users where id='${owner}';`);
  assert.equal(sql(`select count(*) from goal_private.operation_ledger where owner_id='${owner}';`),'0');
});
