// Names-only evidence verification; not clinical/member enumeration certification.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
const base='docs/evidence/2026-11-08-nmc-',hash=s=>createHash('sha256').update(s).digest('hex'),key=s=>s.trim().replace(/\s+/gu,' ').toLowerCase();
export function verifyFamily(text,batch='01'){
 assert(/^[0-9]{2}$/.test(batch)&&Number(batch)>0);const cache=new Map(),read=p=>{if(!cache.has(p))cache.set(p,JSON.parse(text(p)));return cache.get(p);};
 const queuePath=base+'parent-follow-up-queue.json',family=read(queuePath).rows.filter(r=>r.scopeDisposition==='family-context');assert.equal(family.length,652);
 const inventories=[base+'foundation-names-only-index.json',base+'name-role-proposals.json',base+'missing-home-proposals.json'];const lookup=new Map();
 for(const path of inventories){const d=read(path);for(const n of d.names??d.entries??d.homes){const k=key(n.name??n.nameKey);if(!lookup.has(k))lookup.set(k,[]);lookup.get(k).push({path,nameKey:n.nameKey});}}
 const ids=new Set(),refs=new Set(),prior=[];let totalParents=0,components=0;
 for(let i=1;i<=Number(batch);i++){
  const path=base+'family-scope-decomposition-batch-'+String(i).padStart(2,'0')+'.json',p=read(path);assert.equal(p.schemaVersion,1);assert.equal(p.status,'names-only-family-scope-decomposition-proposals');
  for(const f of ['clinicalApproval','learnerActivation','automaticMerging','canonicalIdentityAllocation','officialSourceRechecked','productionRegistryChecked'])assert.equal(p[f],false);
  assert.equal(p.sourceQueuePath,queuePath);assert.equal(p.sourceQueueSha256,hash(text(queuePath)));
  assert.deepEqual(p.comparisonInventoryDigests,inventories.map(path=>({path,sha256:hash(text(path))})));
  assert.deepEqual(p.previousBatchDigests??[],prior,'predecessor evidence drift');
  const size=p.selectionLimit??30;assert(Number.isInteger(size)&&size>0&&size<=200);const expected=family.slice(totalParents,totalParents+size);assert.equal(expected.length,size,'cohort exceeds unprocessed families');assert.deepEqual(p.rows.map(r=>r.parentNameKey),expected.map(r=>r.parentNameKey),'omitted, reordered or duplicated family');
  let appearances=0,currentComponents=0;
  for(let j=0;j<p.rows.length;j++){
   const r=p.rows[j],src=expected[j];assert.equal(r.parentName,src.name);assert.deepEqual(r.sourceTasks,src.sourceTasks);assert.equal(r.decompositionStatus,'editorial-proposal');assert.equal(r.memberEnumeration,'partial-or-unspecified-in-source-task');assert.equal(r.scopeComplete,false);assert.equal(r.bindingComplete,false);assert(r.components.length);
   const allowed=new Set(r.sourceTasks.map(t=>t.referenceId)),covered=new Set();
   for(const t of r.sourceTasks){assert(!refs.has(t.referenceId),'duplicate source appearance');refs.add(t.referenceId);appearances++;const matches=read(t.packetPath).rows.filter(s=>s.referenceId===t.referenceId);assert.equal(matches.length,1);const s=matches[0];assert.equal(hash(s.draftLearningTask),t.editorialTaskSha256);for(const f of ['subjectId','code','page','rowBBox','sourceBodySha256','mode'])assert.deepEqual(s[f],t[f]);}
   for(const c of r.components){
    assert(typeof c.proposalId==='string'&&c.proposalId&&!ids.has(c.proposalId));ids.add(c.proposalId);assert(typeof c.name==='string'&&key(c.name));assert(['reusable-topic-candidate','contextual-task-facet'].includes(c.proposedRole));assert.equal(c.canonicalConceptId,null);assert.equal(c.canonicalObjectiveVersionId,null);assert.equal(c.semanticEquivalence,'unverified');assert.equal(c.mappingAccepted,false);
    assert(c.sourceReferenceIds.length&&new Set(c.sourceReferenceIds).size===c.sourceReferenceIds.length);for(const ref of c.sourceReferenceIds){assert(allowed.has(ref));covered.add(ref);}assert.deepEqual(c.existingExactLabelCandidates,lookup.get(key(c.name))??[]);currentComponents++;
   }
   assert.deepEqual(covered,allowed,'unrepresented family source task');
  }
  totalParents+=p.rows.length;components+=currentComponents;assert.deepEqual(p.totals,{parentNames:p.rows.length,sourceTaskAppearances:appearances,componentProposals:currentComponents,familyParentsWithoutDecompositionProposal:family.length-totalParents});prior.push({path,sha256:hash(text(path))});
 }
 return {status:'PASS',batch,parentNames:totalParents,sourceTaskAppearances:refs.size,componentProposals:components,familyParentsWithoutDecompositionProposal:family.length-totalParents,canonicalAcceptance:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const root=new URL('../../',import.meta.url);execFileSync(process.execPath,[fileURLToPath(new URL('ops/nmc/report-parent-follow-up.js',root)),'--verify'],{stdio:'pipe'});
 const batch=process.argv.find(a=>a.startsWith('--batch='))?.slice(8)??'01';console.log(JSON.stringify(verifyFamily(p=>readFileSync(new URL(p,root),'utf8'),batch)));
}
