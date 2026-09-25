import { test } from 'node:test';
import assert from 'node:assert/strict';
import { manualGoalHTTP } from './manual-v1-http.ts';
test('authoritative receipt is independent of optional projections', async()=>{
  const data={state:'committed',operationId:'op',goalId:'goal'};
  const response=await manualGoalHTTP(new Request('https://example.test/api/goals/manual-v1?action=lookup&operationId=op'),async(a,p)=>{assert.equal(a,'lookup');assert.deepEqual(p,{operationId:'op'});return {ok:true,data};});
  assert.deepEqual(await response.json(),{ok:true,data}); assert.equal(response.headers.get('Cache-Control'),'private, no-store');
});
test('failure never becomes empty, and reads cannot mutate',async()=>{
  const failure=await manualGoalHTTP(new Request('https://example.test/?action=list'),async()=>{throw Error('private DB detail');});
  assert.equal(failure.status,503); assert.equal((await failure.json()).error.code,'CONTRACT_UNAVAILABLE');
  const wrong=await manualGoalHTTP(new Request('https://example.test/?action=submit'),async()=>{throw Error('should not run');});assert.equal(wrong.status,405);
});
test('unsupported children and oversized pages rejected before persistence',async()=>{
  for(const request of [new Request('https://example.test/?action=submit',{method:'POST',body:JSON.stringify({fields:{title:'A',category:'Work & Money',trackers:[]}})}),new Request('https://example.test/?action=list&limit=1.5')]){
    const result=await manualGoalHTTP(request,async()=>{assert.fail('RPC must not run');});assert.equal(result.status,422);
  }
});
