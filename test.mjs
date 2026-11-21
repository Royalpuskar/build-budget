import test from 'node:test';
import assert from 'node:assert/strict';
import {run} from './engine.mjs';
import {sample} from './sample.mjs';
test('domain behavior and boundary cases',()=>{assert.equal(run(sample).metrics.passed,false);assert.equal(run(sample).rows[0].delta,400);assert.equal(run({...sample,budget:2000,assetLimit:1000}).metrics.passed,true);});
test('deterministic result and input preservation',()=>{const copy=JSON.stringify(sample);assert.deepEqual(run(sample),run(sample));assert.equal(JSON.stringify(sample),copy);});
test('reject malformed root and oversized input',()=>{assert.throws(()=>run(null));assert.throws(()=>run([]));assert.throws(()=>run({...sample,oversized:'x'.repeat(200001)}));});

test('deletions do not cancel positive growth policy violations', () => {
  const report=run({budget:1000,assetLimit:1000,growthBudget:100,
    before:[{path:'old',bytes:900},{path:'app',bytes:100}],after:[{path:'app',bytes:300}]});
  assert.equal(report.metrics.netChangeBytes,-700);
  assert.equal(report.metrics.positiveGrowthBytes,200);
  assert.equal(report.metrics.passed,false);
  assert.deepEqual(report.violations,[{kind:'growth-budget',actual:200,limit:100,excess:100}]);
});
test('zero-byte additions and removals retain their identity', () => {
  const report=run({budget:0,assetLimit:0,before:[{path:'old',bytes:0}],after:[{path:'new',bytes:0}]});
  assert.deepEqual(report.rows.map(r=>r.status),['added','removed']);
  assert.equal(report.metrics.passed,true);
});
test('boundary budgets pass and omitted growth budget preserves prior policy', () => {
  const input={budget:5,assetLimit:5,before:[],after:[{path:'a',bytes:5}]};
  assert.equal(run(input).metrics.passed,true);
  assert.equal(run({...input,growthBudget:5}).metrics.passed,true);
  assert.equal(run({...input,growthBudget:0}).metrics.passed,false);
});
test('all failed policies return explicit excess evidence', () => {
  const report=run({budget:1,assetLimit:2,growthBudget:0,before:[],after:[{path:'a',bytes:3}]});
  assert.deepEqual(report.violations.map(v=>[v.kind,v.excess]),[['total-budget',2],['growth-budget',3],['asset-budget',1]]);
});
test('reject fractional bytes, malformed assets, duplicate paths and invalid optional limits', () => {
  for(const value of [null,-1,0.5,Infinity,'5',1e12+1])assert.throws(()=>run({...sample,growthBudget:value}));
  for(const after of [[null],[{path:'a',bytes:0.5}],[{path:'a',bytes:1},{path:'a',bytes:2}],new Array(1)])assert.throws(()=>run({...sample,after}));
});
test('byte conservation holds over every pair of two-asset states', () => {
  // Each asset is absent or present at 0 or 2 bytes: 9 states per snapshot.
  const states=[];
  for(const a of [-1,0,2])for(const b of [-1,0,2])states.push([a,b]);
  const assets=state=>state.flatMap((n,i)=>n<0?[]:[{path:String(i),bytes:n}]);
  for(const a of states)for(const b of states){
    const r=run({budget:10,assetLimit:10,before:assets(a),after:assets(b)}), c=r.accounting;
    assert.equal(r.metrics.netChangeBytes,c.addedBytes+c.grownBytes-c.removedBytes-c.shrunkBytes);
    assert.equal(r.metrics.positiveGrowthBytes,c.addedBytes+c.grownBytes);
    assert.equal(r.metrics.totalBytes-r.metrics.previousBytes,r.rows.reduce((s,x)=>s+x.delta,0));
  }
});
