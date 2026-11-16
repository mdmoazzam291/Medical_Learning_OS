// Names-only metadata projection. Equal names never authorize identity merging.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root=new URL('../../',import.meta.url);
const groups=new Map(),parents=new Set(),ids=new Set(),refs=new Set();
let inferred=0,explicit=0;
for(let i=1;i<=12;i++){
 const path='docs/evidence/2026-11-08-nmc-compound-name-components-batch-'+String(i).padStart(2,'0')+'.json';
 const packet=JSON.parse(readFileSync(new URL(path,root),'utf8'));
 assert.equal(packet.status,'names-only-component-proposals');
 for(const key of ['clinicalApproval','learnerActivation','automaticMerging'])assert.equal(packet[key],false);
 for(const row of packet.rows){
  assert(!parents.has(row.parentNameKey),'duplicate parent');parents.add(row.parentNameKey);
  const sources=new Map(row.sourceAppearances.map(a=>[a.referenceId,a]));
  assert.equal(sources.size,row.sourceAppearances.length);
  for(const id of sources.keys())refs.add(id);
  const scopeEvidence=row.sourceScopeEvidence?[row.sourceScopeEvidence]:row.sourceScopeEvidenceByReference;
  if(scopeEvidence){
   assert.equal(new Set(scopeEvidence.map(e=>e.sourceReferenceId)).size,scopeEvidence.length);
   assert.deepEqual(scopeEvidence.map(e=>e.sourceReferenceId),[...sources.keys()]);
   for(const e of scopeEvidence){
    assert.equal(e.basis,'existing-editorial-parent-label-and-task-scope');
    assert.equal(e.officialSourceRechecked,false);assert.equal(e.clinicalValidation,false);
    assert(/^[a-f0-9]{40}$/.test(e.checkedAtHead));
    assert(/^docs\/evidence\/[a-z0-9-]+-draft-tasks\.json$/.test(e.sourcePacketPath));
    assert(sources.has(e.sourceReferenceId));
    assert.equal(sources.get(e.sourceReferenceId).packet,e.sourcePacketPath);
    const source=JSON.parse(readFileSync(new URL(e.sourcePacketPath,root),'utf8')).rows.find(r=>r.referenceId===e.sourceReferenceId);
    assert(source,'missing editorial task');
    const appearance=sources.get(e.sourceReferenceId);
    assert.equal(source.code,appearance.code);assert.equal(source.subjectId,appearance.subjectId);assert.equal(source.page,appearance.pdfPage);
    assert.equal(source.sourceBodySha256,e.sourceBodySha256);
    assert.equal(createHash('sha256').update(source.draftLearningTask).digest('hex'),e.editorialTaskSha256,'editorial task drift');
   }
   for(const c of row.components)assert.deepEqual(c.sourceReferenceIds,[...sources.keys()]);
  }
  for(const c of row.components){
   assert(!ids.has(c.componentProposalId),'duplicate component');ids.add(c.componentProposalId);
   assert.equal(c.canonicalConceptId,null);assert.equal(c.canonicalObjectiveVersionId,null);
   assert.equal(c.identityStatus,'unresolved-editorial-proposal');
   assert.equal(typeof c.name,'string');assert(c.name.trim());
   const key=c.name.normalize('NFC').trim().toLowerCase();
   if(c.nameKey!==undefined)assert.equal(c.nameKey,key);
   const sourceIds=c.sourceReferenceIds??[...sources.keys()];
   assert(sourceIds.length);assert.equal(new Set(sourceIds).size,sourceIds.length);
   for(const id of sourceIds)assert(sources.has(id),'unknown component source');
   if(!c.sourceReferenceIds)assert.equal(sources.size,1,'multi-reference scope requires explicit bindings');
   if(c.sourceReferenceIds)explicit++;else inferred++;
   if(!groups.has(key))groups.set(key,{nameKey:key,name:c.name,canonicalConceptId:null,canonicalObjectiveVersionId:null,semanticEquivalence:'unverified',scopeKind:'unclassified-concept-or-facet',occurrences:[]});
   groups.get(key).occurrences.push({componentProposalId:c.componentProposalId,parentNameKey:row.parentNameKey,batchPath:path,sourceBindingBasis:c.sourceReferenceIds?'explicit-component-reference':'inferred-from-parent-scope',sourceAppearances:sourceIds.map(id=>{const a=sources.get(id);return {referenceId:a.referenceId,subjectId:a.subjectId,code:a.code,pdfPage:a.pdfPage,packet:a.packet};})});
  }
 }
}
const names=[...groups.values()].sort((a,b)=>a.nameKey.localeCompare(b.nameKey));
for(const g of names){
 g.subjectIds=[...new Set(g.occurrences.flatMap(o=>o.sourceAppearances.map(a=>a.subjectId)))].sort();
 g.batchCount=new Set(g.occurrences.map(o=>o.batchPath)).size;
}
const totals={batches:12,parentNames:parents.size,componentOccurrences:ids.size,distinctReferences:refs.size,distinctNormalizedNames:names.length,repeatedNameGroups:names.filter(g=>g.occurrences.length>1).length,crossSubjectNameGroups:names.filter(g=>g.subjectIds.length>1).length,crossBatchNameGroups:names.filter(g=>g.batchCount>1).length,explicitComponentBindings:explicit,inferredParentBindings:inferred};
assert.equal(totals.parentNames,420);assert.equal(totals.componentOccurrences,1218);
console.log(JSON.stringify({schemaVersion:1,status:'names-only-consolidation-candidates',automaticMerging:false,clinicalApproval:false,learnerActivation:false,productionRegistryChecked:false,coverageFraction:null,totals,names},null,2));
