// Disposable-only. No network/database URL or production adapter.
import assert from 'node:assert/strict';
import {runStagingScenario,stagingScenarios,owner} from '../tests/helpers/source-evidence-staging-conformance.js';
import {digestSourceRowPackage} from '../src/domain/source-row-evidence.js';
import {createSourceEvidenceSqlDriver} from './lib/source-evidence-sql-driver.js';
const {PGlite}=await import(process.env.PGLITE_MODULE_URL||'@electric-sql/pglite');
const create=()=>createSourceEvidenceSqlDriver({PGlite});
for(const scenario of stagingScenarios){await runStagingScenario(scenario,create);console.log(`SQL conformance PASS: ${scenario}`);}
for(const scenario of ['lost-response','readback-tampered']){
 await assert.rejects(runStagingScenario(scenario,async()=>{
  const d=await create();return {...d,async stageMetadata(...args){const r=await d.stageMetadata(...args);if(['uncertain','integrity-failure'].includes(r.status))return {status:'accepted',receipt:(await d.inspect()).requests[0].receipt};return r;}};
 }),assert.AssertionError);console.log(`Broken SQL driver rejected: ${scenario} false acceptance`);
}
await assert.rejects(runStagingScenario('retry',async()=>{
 const d=await create();return {...d,async inspect(){const s=await d.inspect();for(const r of s.revisions)r.candidate.cases[0].caseVersion=999;return s;}};
}),assert.AssertionError);
console.log('SQL conformance PASS: 10 scenarios and 3 broken-driver controls; disposable embedded SQL only.');

const p={packageId:owner,packageVersion:1,cases:[{caseId:'lifecycle',caseVersion:1,sourceSha256:'a'.repeat(64),sourceEdition:'synthetic-2026',appearance:{pdfPage:1,rowOrdinal:1,rotation:0,bboxMilliPoints:[0,0,1,1],rawCellSha256:'b'.repeat(64)},interpretation:{proposedIdentity:null,relation:'unresolved',rationaleSha256:'c'.repeat(64)}}]};
const c={...p,requestId:owner,expectedPackageDigest:(await digestSourceRowPackage(p)).packageDigest},d=await create();
try{const pending=d.stageMetadata(c,owner);let firstClosed=false;const firstClose=d.close().then(()=>{firstClosed=true;});await d.close();assert.equal(firstClosed,true,'concurrent close waits for the same drain');await firstClose;assert.equal((await pending).status,'accepted');await d.close();await assert.rejects(d.stageMetadata(c,owner),/closed/);}finally{await d.close();}
console.log('SQL driver lifecycle PASS: close drains in-flight staging and rejects new work.');
