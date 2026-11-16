// Names-only home authoring: source accounting never accepts a canonical mapping.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const base='docs/evidence/2026-11-08-nmc-',hash=s=>createHash('sha256').update(s).digest('hex'),key=s=>s.trim().replace(/\s+/gu,' ').toLowerCase();
export function verifyScopedHomes(text,batch='01'){
 assert(/^[0-9]{2}$/.test(batch)&&Number(batch)>0);
 const cache=new Map(),raw=p=>{if(!cache.has(p))cache.set(p,text(p));return cache.get(p);},read=p=>JSON.parse(raw(p));
 const qp=base+'parent-follow-up-queue.json',cohort=read(qp).rows.filter(r=>r.nextAction==='resolve-home-and-bind-task');assert.equal(cohort.length,659);
 const inventories=['foundation-names-only-index.json','name-role-proposals.json','missing-home-proposals.json'].map(p=>base+p),lookup=new Map();
 for(const path of inventories){const d=read(path);for(const n of d.names??d.entries??d.homes){const k=key(n.name??n.nameKey);if(!lookup.has(k))lookup.set(k,[]);lookup.get(k).push({path,nameKey:n.nameKey});}}
 const prior=[],ids=new Set(),refs=new Set(),homes=new Set();let count=0;
 for(let i=1;i<=Number(batch);i++){
  const path=base+'scoped-task-home-proposals-batch-'+String(i).padStart(2,'0')+'.json',p=read(path);
  assert.equal(p.schemaVersion,1);assert.equal(p.status,'names-only-scoped-task-home-proposals');
  for(const f of ['clinicalApproval','learnerActivation','automaticMerging','canonicalIdentityAllocation','officialSourceRechecked','productionRegistryChecked'])assert.equal(p[f],false);
  assert.equal(p.sourceQueuePath,qp);assert.equal(p.sourceQueueSha256,hash(raw(qp)));assert.deepEqual(p.previousBatchDigests,prior);
  assert.deepEqual(p.comparisonInventoryDigests,inventories.map(path=>({path,sha256:hash(raw(path))})));
  assert(Number.isInteger(p.selectionLimit)&&p.selectionLimit>0&&p.selectionLimit<=200);
  const expected=cohort.slice(count,count+p.selectionLimit);assert.equal(expected.length,p.selectionLimit);
  assert.deepEqual(p.rows.map(r=>r.facetNameKey),expected.map(r=>r.parentNameKey),'cohort omission, repetition or reorder');
  const batchHomes=new Set();let appearances=0,existing=0;
  for(let j=0;j<p.rows.length;j++){
   const r=p.rows[j],src=expected[j];assert.equal(r.facetName,src.name);assert.deepEqual(r.sourceTasks,src.sourceTasks);
   assert(r.proposalId&&!ids.has(r.proposalId));ids.add(r.proposalId);
   assert(typeof r.proposedHomeName==='string'&&r.proposedHomeName.trim());assert.equal(r.proposedHomeNameKey,key(r.proposedHomeName));assert.notEqual(r.proposedHomeNameKey,r.facetNameKey,'self-parent is not independent home evidence');
   assert.equal(r.relation,'proposed-scope-facet-of-name-candidate');assert(r.basis&&typeof r.basis==='string');
   assert.deepEqual(r.existingExactLabelCandidates,lookup.get(r.proposedHomeNameKey)??[]);
   assert.equal(r.semanticEquivalence,'unverified');assert.equal(r.canonicalConceptId,null);assert.equal(r.canonicalObjectiveVersionId,null);
   for(const f of ['mappingAccepted','scopeComplete','bindingComplete','independentCompetenceEstablished'])assert.equal(r[f],false);
   for(const t of r.sourceTasks){
    assert(!refs.has(t.referenceId));refs.add(t.referenceId);appearances++;
    const matches=read(t.packetPath).rows.filter(s=>s.referenceId===t.referenceId);assert.equal(matches.length,1);const s=matches[0];assert.equal(t.editorialTaskSha256,hash(s.draftLearningTask));
    for(const f of ['subjectId','code','page','rowBBox','sourceBodySha256','mode'])assert.deepEqual(t[f],s[f]);
   }
   homes.add(r.proposedHomeNameKey);batchHomes.add(r.proposedHomeNameKey);if(r.existingExactLabelCandidates.length)existing++;
  }
  count+=p.rows.length;
  assert.deepEqual(p.totals,{facets:p.rows.length,sourceAppearances:appearances,distinctProposedHomes:batchHomes.size,existingNameHomeLinks:existing,newNameHomeLinks:p.rows.length-existing,facetsWithoutInitialHomeProposal:cohort.length-count});
  prior.push({path,sha256:hash(raw(path))});
 }
 return {status:'PASS',facets:count,sourceAppearances:refs.size,distinctProposedHomes:homes.size,facetsWithoutInitialHomeProposal:cohort.length-count,canonicalAcceptance:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const root=new URL('../../',import.meta.url),batch=process.argv.find(a=>a.startsWith('--batch='))?.slice(8)??'01';
 console.log(JSON.stringify(verifyScopedHomes(p=>readFileSync(new URL(p,root),'utf8'),batch)));
}
