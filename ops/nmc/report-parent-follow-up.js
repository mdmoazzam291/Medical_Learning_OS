// Deterministic authoring queue; no acceptance, identity allocation or publication.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
const routes={'mixed-scope-pending':'decompose-mixed-scope','family-context':'decompose-family-context','standalone-topic-candidate':'check-semantic-reuse-and-bind-topic','scoped-task-facet':'resolve-home-and-bind-task'};
export function buildQueue(batches){
 assert(batches.length>0);const names=new Set(),refs=new Set(),rows=[];
 for(const b of batches){
  assert.equal(b.status,'names-only-parent-scope-assessments');
  for(const key of ['clinicalApproval','learnerActivation','automaticMerging','canonicalIdentityAllocation'])assert.equal(b[key],false);
  for(const r of b.rows){
   assert(!names.has(r.parentNameKey),'overlapping parent name');names.add(r.parentNameKey);
   assert(Object.hasOwn(routes,r.scopeDisposition),'unknown disposition');
   assert.equal(r.mappingAccepted,false);assert.equal(r.scopeComplete,false);assert.equal(r.canonicalConceptId,null);assert.equal(r.canonicalObjectiveVersionId,null);assert.equal(r.semanticEquivalence,'unverified');assert(r.sourceTasks.length);
   for(const t of r.sourceTasks){assert(!refs.has(t.referenceId),'overlapping source reference');refs.add(t.referenceId);}
   rows.push({...structuredClone(r),assessmentBatch:b.batch,nextAction:routes[r.scopeDisposition]});
  }
 }
 return {schemaVersion:1,status:'names-only-parent-follow-up-queue',clinicalApproval:false,learnerActivation:false,automaticMerging:false,canonicalIdentityAllocation:false,totals:{parentNames:names.size,sourceTaskAppearances:refs.size},actionCounts:Object.fromEntries(Object.values(routes).map(a=>[a,rows.filter(r=>r.nextAction===a).length])),rows};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const root=new URL('../../',import.meta.url),base='docs/evidence/2026-11-08-nmc-',paths=Array.from({length:11},(_,i)=>base+'parent-scope-assessments-batch-'+String(i+1).padStart(2,'0')+'.json');
 const text=p=>readFileSync(new URL(p,root),'utf8');
 // Revalidate underlying task evidence, not just saved projection hashes.
 for(let i=1;i<=11;i++)execFileSync(process.execPath,[fileURLToPath(new URL('ops/nmc/report-parent-scope-assessments.js',root)),'--batch='+String(i).padStart(2,'0'),'--verify'],{stdio:'pipe'});
 const result=buildQueue(paths.map(p=>JSON.parse(text(p))));
 assert.equal(result.totals.parentNames,1950);assert.equal(result.totals.sourceTaskAppearances,2094);
 result.sourceBatchDigests=paths.map(path=>({path,sha256:createHash('sha256').update(text(path)).digest('hex')}));
 const path=base+'parent-follow-up-queue.json';
 if(process.argv.includes('--verify')){assert.deepEqual(JSON.parse(text(path)),result,'follow-up queue differs from source evidence');console.log(JSON.stringify({status:'PASS',...result.totals,actionCounts:result.actionCounts,canonicalAcceptance:false}));}
 else console.log(JSON.stringify(result,null,2));
}
