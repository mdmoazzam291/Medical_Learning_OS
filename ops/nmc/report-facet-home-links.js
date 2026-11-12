// Names-only authoring projection. Label resolution never merges canonical identities.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../../',import.meta.url),read=p=>JSON.parse(readFileSync(new URL(p,root),'utf8'));
const roles=read('docs/evidence/2026-11-08-nmc-name-role-proposals.json');
const proposals=read('docs/evidence/2026-11-08-nmc-missing-home-proposals.json');
const resolutions=read('docs/evidence/2026-11-08-nmc-home-label-resolutions.json');
const sharedPath='docs/evidence/2026-11-08-nmc-shared-facet-scope-proposals.json',shared=read(sharedPath);
const norm=s=>s.normalize('NFC').trim().toLowerCase(),byName=new Map(roles.entries.map(e=>[e.nameKey,e]));
const facets=roles.entries.filter(e=>e.classificationRole==='scope-facet');
const bindings=e=>({facetNameKey:e.nameKey,componentProposalIds:e.occurrences.map(o=>o.componentProposalId),sourceReferenceIds:[...new Set(e.occurrences.flatMap(o=>o.sourceReferenceIds))].sort()});
assert.equal(byName.size,roles.entries.length);
assert.equal(proposals.status,'names-only-home-proposals');assert.equal(resolutions.status,'names-only-home-label-resolutions');
for(const p of [proposals,resolutions])for(const k of ['clinicalApproval','learnerActivation','automaticMerging','productionRegistryChecked','canonicalIdentityAllocation'])assert.equal(p[k],false);
const aliases=new Map();
for(const a of resolutions.resolutions){
 assert.equal(a.proposedHomeNameKey,norm(a.proposedHomeNameKey));assert.equal(a.resolvedHomeNameKey,norm(a.resolvedHomeLabel));
 assert.notEqual(a.proposedHomeNameKey,a.resolvedHomeNameKey);assert(!aliases.has(a.proposedHomeNameKey),'duplicate label resolution');
 assert.equal(a.basis,'explicit-editorial-label-resolution');assert.equal(a.canonicalConceptId,null);assert.equal(a.mappingAccepted,false);assert.equal(a.clinicalValidation,false);
 const expected=facets.filter(e=>norm(e.proposedHomeLabel)===a.proposedHomeNameKey).map(bindings);
 assert(expected.length);assert.deepEqual(a.facetBindings,expected,'label resolution source drift');
 aliases.set(a.proposedHomeNameKey,a);
}
for(const a of aliases.values())assert(!aliases.has(a.resolvedHomeNameKey),'chained or cyclic label resolution');
const homes=new Map(),homeIds=new Set();let boundFacets=0;
for(const h of proposals.homes){
 assert.equal(h.nameKey,norm(h.name));assert(!homes.has(h.nameKey));assert(!homeIds.has(h.homeProposalId));
 assert(h.homeProposalId.startsWith('editorial-home:'));homeIds.add(h.homeProposalId);
 assert(!byName.has(h.nameKey),'reuse existing name');assert(!aliases.has(h.nameKey),'resolve raw label before creating home');
 for(const k of ['canonicalConceptId','canonicalObjectiveVersionId','coverageFraction'])assert.equal(h[k],null);
 for(const k of ['identityAccepted','mappingAccepted','scopeComplete'])assert.equal(h[k],false);
 assert(['existing-proposed-home-label-and-bound-facet-context','existing-facet-context-with-explicit-label-resolution','explicit-family-context-with-bound-facets'].includes(h.basis));
 const expected=facets.filter(e=>(aliases.get(norm(e.proposedHomeLabel))?.resolvedHomeNameKey??norm(e.proposedHomeLabel))===h.nameKey).map(bindings);
 assert(expected.length);assert.deepEqual(h.facetBindings,expected,'home source bindings changed');
 homes.set(h.nameKey,h);boundFacets+=expected.length;
}
assert.deepEqual(proposals.totals,{homeNames:homes.size,facetBindings:boundFacets});
for(const a of aliases.values())assert(homes.has(a.resolvedHomeNameKey)||byName.get(a.resolvedHomeNameKey)?.classificationRole==='reusable-name-candidate','unresolved label target');
assert.equal(shared.schemaVersion,1);assert.equal(shared.status,'names-only-shared-facet-scope-proposals');
for(const k of ['clinicalApproval','learnerActivation','automaticMerging','productionRegistryChecked','canonicalIdentityAllocation','officialSourceRechecked'])assert.equal(shared[k],false);
const sharedByFacet=new Map();
const taskEvidence=facet=>{
 const tasks=new Map(),referenceIds=bindings(facet).sourceReferenceIds;
 for(const occurrence of facet.occurrences){
  const parent=read(occurrence.batchPath).rows.find(r=>r.parentNameKey===occurrence.parentNameKey);assert(parent,'unknown shared-scope source parent');
  for(const appearance of parent.sourceAppearances.filter(a=>referenceIds.includes(a.referenceId))){
   const matches=[];
   const walk=value=>{
    if(Array.isArray(value))value.forEach(walk);
    else if(value&&typeof value==='object'){
     if(value.referenceId===appearance.referenceId&&value.sourceBodySha256)matches.push(value);
     else Object.values(value).forEach(walk);
    }
   };
   walk(read(appearance.packet));assert.equal(matches.length,1,'ambiguous shared-scope source task');
   const t=matches[0],metadata={referenceId:t.referenceId,packetPath:appearance.packet,subjectId:t.subjectId,code:t.code,page:t.page,rowBBox:t.rowBBox,sourceBodySha256:t.sourceBodySha256,mode:t.mode};
   if(tasks.has(t.referenceId))assert.deepEqual(tasks.get(t.referenceId),metadata,'conflicting shared-scope source evidence');
   tasks.set(t.referenceId,metadata);
  }
 }
 assert.deepEqual([...tasks.keys()].sort(),referenceIds,'shared scope source task omission');
 return [...tasks.values()].sort((a,b)=>a.referenceId.localeCompare(b.referenceId));
};
for(const h of homes.values()){
 if(h.basis==='explicit-family-context-with-bound-facets'){
  assert.equal(h.scopeType,'family-context-only','family context scope type');assert.equal(h.targetCoverage,'unverified');
  const tasks=new Map();
  for(const binding of h.facetBindings)for(const task of taskEvidence(byName.get(binding.facetNameKey))){
   if(tasks.has(task.referenceId))assert.deepEqual(tasks.get(task.referenceId),task,'conflicting family context source evidence');
   tasks.set(task.referenceId,task);
  }
  assert.deepEqual(h.sourceTasks,[...tasks.values()].sort((a,b)=>a.referenceId.localeCompare(b.referenceId)),'family context task evidence drift');
 }else assert.equal(h.scopeType,undefined,'family context requires explicit basis');
}
for(const g of shared.groups){
 const facet=byName.get(g.facetNameKey);assert.equal(facet?.classificationRole,'scope-facet','unknown shared-scope facet');
 assert(!sharedByFacet.has(g.facetNameKey),'duplicate shared-scope facet');
 assert.deepEqual({facetNameKey:g.facetNameKey,componentProposalIds:g.componentProposalIds,sourceReferenceIds:g.sourceReferenceIds},bindings(facet),'shared scope source drift');
 const rawKey=norm(facet.proposedHomeLabel),key=aliases.get(rawKey)?.resolvedHomeNameKey??rawKey;
 assert(!homes.has(key)&&byName.get(key)?.classificationRole!=='reusable-name-candidate','shared scope cannot override a single home');
 assert.equal(g.basis,'explicit-shared-source-task-context');
 for(const k of ['canonicalConceptId','canonicalObjectiveVersionId'])assert.equal(g[k],null,'shared scope has no accepted identity');
 for(const k of ['mappingAccepted','scopeComplete'])assert.equal(g[k],false,'shared scope is unaccepted');
 assert.equal(g.targetCoverage,'unverified');assert(Array.isArray(g.targetNameKeys)&&g.targetNameKeys.length>=2);
 assert.equal(new Set(g.targetNameKeys).size,g.targetNameKeys.length,'duplicate shared-scope target');
 for(const key of g.targetNameKeys)assert.equal(byName.get(key)?.classificationRole,'reusable-name-candidate','unknown reusable shared-scope target');
 assert.deepEqual(g.sourceTasks,taskEvidence(facet),'shared scope task evidence drift');
 sharedByFacet.set(g.facetNameKey,g);
}
const links=[],unresolved=[],sharedScopeGroups=[];
for(const facet of facets){
 const homeKey=norm(facet.proposedHomeLabel),alias=aliases.get(homeKey),targetKey=alias?.resolvedHomeNameKey??homeKey,target=byName.get(targetKey),home=homes.get(targetKey);
 const source={facetNameKey:facet.nameKey,proposedHomeNameKey:homeKey,componentProposalIds:facet.occurrences.map(o=>o.componentProposalId),sourceReferenceIds:[...new Set(facet.occurrences.flatMap(o=>o.sourceReferenceIds))].sort()};
 const flags={semanticEquivalence:'unverified',canonicalConceptId:null,canonicalObjectiveVersionId:null,mappingAccepted:false};
 const sharedGroup=sharedByFacet.get(facet.nameKey);
 if(sharedGroup){
  sharedScopeGroups.push({...source,relation:'proposed-shared-source-task-context',basis:sharedGroup.basis,...flags,scopeComplete:false,targetCoverage:'unverified',targets:sharedGroup.targetNameKeys.map(key=>({targetNameKey:key,targetComponentProposalIds:byName.get(key).occurrences.map(o=>o.componentProposalId),targetSourceReferenceIds:[...new Set(byName.get(key).occurrences.flatMap(o=>o.sourceReferenceIds))].sort(),canonicalConceptId:null,canonicalObjectiveVersionId:null,mappingAccepted:false,scopeComplete:false}))});
  continue;
 }
 const resolution=alias?{resolvedHomeNameKey:targetKey,labelResolutionBasis:alias.basis}:{};
 if(target?.classificationRole==='reusable-name-candidate'){
  assert.notEqual(facet.nameKey,target.nameKey);
  links.push({...source,...resolution,targetNameKey:target.nameKey,targetComponentProposalIds:target.occurrences.map(o=>o.componentProposalId),relation:'proposed-scope-facet-of-name-candidate',basis:alias?'explicit-editorial-home-label-resolution':'exact-normalized-editorial-home-label',...flags});
 }else if(home)links.push({...source,...resolution,targetNameKey:home.nameKey,targetHomeProposalId:home.homeProposalId,...(home.scopeType?{targetScopeType:home.scopeType,targetCoverage:home.targetCoverage}:{}),relation:'proposed-scope-facet-of-home-proposal',basis:alias?'explicit-editorial-home-label-resolution':'exact-normalized-declared-home-label',...flags});
 else unresolved.push({...source,reason:target?'home-label-is-scope-facet':'home-label-has-no-name-candidate',canonicalConceptId:null});
}
links.sort((a,b)=>a.facetNameKey.localeCompare(b.facetNameKey));unresolved.sort((a,b)=>a.facetNameKey.localeCompare(b.facetNameKey));
sharedScopeGroups.sort((a,b)=>a.facetNameKey.localeCompare(b.facetNameKey));
const result={schemaVersion:2,status:'editorial-facet-home-link-proposals',sourceRolePath:'docs/evidence/2026-11-08-nmc-name-role-proposals.json',sourceHomeProposalPath:'docs/evidence/2026-11-08-nmc-missing-home-proposals.json',sourceLabelResolutionPath:'docs/evidence/2026-11-08-nmc-home-label-resolutions.json',sourceSharedScopePath:sharedPath,automaticMerging:false,clinicalApproval:false,learnerActivation:false,registryAcceptance:false,coverageFraction:null,totals:{classifiedNames:roles.entries.length,scopeFacets:links.length+sharedScopeGroups.length+unresolved.length,sharedScopeFacetCount:sharedScopeGroups.length,sharedScopeTargetLinks:sharedScopeGroups.reduce((n,g)=>n+g.targets.length,0),exactCandidateHomeLinks:links.filter(l=>l.targetComponentProposalIds&&!l.resolvedHomeNameKey).length,labelResolvedCandidateHomeLinks:links.filter(l=>l.targetComponentProposalIds&&l.resolvedHomeNameKey).length,proposedNewHomeLinks:links.filter(l=>l.targetHomeProposalId).length,totalFacetHomeLinks:links.length,unresolvedFacetHomes:unresolved.length,distinctCandidateHomes:new Set([...links.map(l=>l.targetNameKey),...sharedScopeGroups.flatMap(g=>g.targets.map(t=>t.targetNameKey))]).size,explicitLabelResolutions:aliases.size},links,sharedScopeGroups,unresolved};
assert.equal(result.totals.scopeFacets,roles.totals.scopeFacets,'facet denominator differs from source roles');
if(process.argv.includes('--verify')){
 assert.deepEqual(read('docs/evidence/2026-11-08-nmc-facet-home-links.json'),result,'facet-home projection differs from source roles');
 console.log(JSON.stringify({status:'PASS',...result.totals,canonicalAcceptance:false}));
}else console.log(JSON.stringify(result,null,2));
