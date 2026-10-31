import test from 'node:test';
import assert from 'node:assert/strict';
import {runStagingScenario,stagingScenarios} from './helpers/source-evidence-staging-conformance.js';
import {createStagingModel} from './helpers/source-evidence-staging-model.js';
for(const scenario of stagingScenarios)test(`staging conformance: ${scenario}`,()=>runStagingScenario(scenario,createStagingModel));
const mutations={retry:'duplicate-retry','atomic-failure':'partial-write','lost-response':'accept-uncertain','readback-tampered':'accept-tampered','authority-recheck':'ignore-denial'};
for(const [scenario,mutation] of Object.entries(mutations))test(`harness rejects broken model: ${mutation}`,async()=>{
 await assert.rejects(runStagingScenario(scenario,()=>createStagingModel({mutation})),assert.AssertionError);
});
test('harness rejects inconsistent authoritative stored claims',async()=>{
 await assert.rejects(runStagingScenario('retry',()=>{
  const d=createStagingModel(),inspect=d.inspect;
  return {...d,async inspect(){const s=await inspect();for(const r of s.revisions)r.candidate.cases[0].caseVersion=999;return s;}};
 }),assert.AssertionError);
});
