// Classifications organize authoring names; they never accept or merge registry identities.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../../',import.meta.url);
const read=p=>JSON.parse(readFileSync(new URL(p,root),'utf8'));
const p=read('docs/evidence/2026-11-08-nmc-name-role-proposals.json');
assert.equal(p.status,'editorial-name-role-proposals');
for(const k of ['automaticMerging','clinicalApproval','learnerActivation','productionRegistryChecked'])assert.equal(p[k],false);
assert.equal(p.coverageFraction,null);
const ids=new Set(),names=new Set();let candidates=0,facets=0,count=0;
for(const e of p.entries){
 assert.equal(e.canonicalConceptId,null);assert.equal(e.canonicalObjectiveVersionId,null);
 assert.equal(e.semanticEquivalence,'unverified');
 assert.equal(e.nameKey,e.name.normalize('NFC').trim().toLowerCase());assert(!names.has(e.nameKey));names.add(e.nameKey);
 assert(['reusable-name-candidate','scope-facet'].includes(e.classificationRole));
 assert.equal(typeof e.proposedKind,'string');assert(e.proposedKind.trim());assert.equal(typeof e.proposedHomeLabel,'string');assert(e.proposedHomeLabel.trim());
 if(e.classificationRole==='scope-facet')facets++;else candidates++;
 assert(e.occurrences.length);
 for(const o of e.occurrences){
  assert(/^docs\/evidence\/2026-11-08-nmc-compound-name-components-batch-[0-9]{2}\.json$/.test(o.batchPath));
  assert(!ids.has(o.componentProposalId));ids.add(o.componentProposalId);count++;
  const row=read(o.batchPath).rows.find(r=>r.parentNameKey===o.parentNameKey);assert(row,'unknown parent');
  const c=row.components.find(c=>c.componentProposalId===o.componentProposalId);assert(c,'unknown component');
  assert.equal(c.name.normalize('NFC').trim().toLowerCase(),e.nameKey);
  assert.deepEqual(o.sourceReferenceIds,c.sourceReferenceIds);
 }
}
assert.deepEqual(p.totals,{entries:names.size,reusableNameCandidates:candidates,scopeFacets:facets,componentOccurrences:count});
assert.equal(p.expectedComponentBatchCount,12);
const expectedIds=new Set(),expectedNames=new Set();
for(let i=1;i<=p.expectedComponentBatchCount;i++){
 const path='docs/evidence/2026-11-08-nmc-compound-name-components-batch-'+String(i).padStart(2,'0')+'.json';
 for(const row of read(path).rows)for(const c of row.components){
  assert(!expectedIds.has(c.componentProposalId),'duplicate source component');
  expectedIds.add(c.componentProposalId);expectedNames.add(c.name.normalize('NFC').trim().toLowerCase());
 }
}
assert.deepEqual([...ids].sort(),[...expectedIds].sort(),'incomplete component role coverage');
assert.deepEqual([...names].sort(),[...expectedNames].sort(),'incomplete name role coverage');
console.log(JSON.stringify({status:'PASS',...p.totals,completeForSelectedComponentBatches:true,canonicalAcceptance:false}));
