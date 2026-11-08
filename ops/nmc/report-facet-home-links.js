// Names-only authoring projection. Label resolution never merges canonical identities.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../../',import.meta.url),read=p=>JSON.parse(readFileSync(new URL(p,root),'utf8'));
const roles=read('docs/evidence/2026-11-08-nmc-name-role-proposals.json');
const proposals=read('docs/evidence/2026-11-08-nmc-missing-home-proposals.json');
const resolutions=read('docs/evidence/2026-11-08-nmc-home-label-resolutions.json');
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
 assert(['existing-proposed-home-label-and-bound-facet-context','existing-facet-context-with-explicit-label-resolution'].includes(h.basis));
 const expected=facets.filter(e=>(aliases.get(norm(e.proposedHomeLabel))?.resolvedHomeNameKey??norm(e.proposedHomeLabel))===h.nameKey).map(bindings);
 assert(expected.length);assert.deepEqual(h.facetBindings,expected,'home source bindings changed');
 homes.set(h.nameKey,h);boundFacets+=expected.length;
}
assert.deepEqual(proposals.totals,{homeNames:homes.size,facetBindings:boundFacets});
for(const a of aliases.values())assert(homes.has(a.resolvedHomeNameKey)||byName.get(a.resolvedHomeNameKey)?.classificationRole==='reusable-name-candidate','unresolved label target');
const links=[],unresolved=[];
for(const facet of facets){
 const homeKey=norm(facet.proposedHomeLabel),alias=aliases.get(homeKey),targetKey=alias?.resolvedHomeNameKey??homeKey,target=byName.get(targetKey),home=homes.get(targetKey);
 const source={facetNameKey:facet.nameKey,proposedHomeNameKey:homeKey,componentProposalIds:facet.occurrences.map(o=>o.componentProposalId),sourceReferenceIds:[...new Set(facet.occurrences.flatMap(o=>o.sourceReferenceIds))].sort()};
 const flags={semanticEquivalence:'unverified',canonicalConceptId:null,canonicalObjectiveVersionId:null,mappingAccepted:false};
 const resolution=alias?{resolvedHomeNameKey:targetKey,labelResolutionBasis:alias.basis}:{};
 if(target?.classificationRole==='reusable-name-candidate'){
  assert.notEqual(facet.nameKey,target.nameKey);
  links.push({...source,...resolution,targetNameKey:target.nameKey,targetComponentProposalIds:target.occurrences.map(o=>o.componentProposalId),relation:'proposed-scope-facet-of-name-candidate',basis:alias?'explicit-editorial-home-label-resolution':'exact-normalized-editorial-home-label',...flags});
 }else if(home)links.push({...source,...resolution,targetNameKey:home.nameKey,targetHomeProposalId:home.homeProposalId,relation:'proposed-scope-facet-of-home-proposal',basis:alias?'explicit-editorial-home-label-resolution':'exact-normalized-declared-home-label',...flags});
 else unresolved.push({...source,reason:target?'home-label-is-scope-facet':'home-label-has-no-name-candidate',canonicalConceptId:null});
}
links.sort((a,b)=>a.facetNameKey.localeCompare(b.facetNameKey));unresolved.sort((a,b)=>a.facetNameKey.localeCompare(b.facetNameKey));
const result={schemaVersion:1,status:'editorial-facet-home-link-proposals',sourceRolePath:'docs/evidence/2026-11-08-nmc-name-role-proposals.json',sourceHomeProposalPath:'docs/evidence/2026-11-08-nmc-missing-home-proposals.json',sourceLabelResolutionPath:'docs/evidence/2026-11-08-nmc-home-label-resolutions.json',automaticMerging:false,clinicalApproval:false,learnerActivation:false,registryAcceptance:false,coverageFraction:null,totals:{classifiedNames:roles.entries.length,scopeFacets:links.length+unresolved.length,exactCandidateHomeLinks:links.filter(l=>l.targetComponentProposalIds&&!l.resolvedHomeNameKey).length,labelResolvedCandidateHomeLinks:links.filter(l=>l.targetComponentProposalIds&&l.resolvedHomeNameKey).length,proposedNewHomeLinks:links.filter(l=>l.targetHomeProposalId).length,totalFacetHomeLinks:links.length,unresolvedFacetHomes:unresolved.length,distinctCandidateHomes:new Set(links.map(l=>l.targetNameKey)).size,explicitLabelResolutions:aliases.size},links,unresolved};
assert.equal(result.totals.scopeFacets,407);
if(process.argv.includes('--verify')){
 assert.deepEqual(read('docs/evidence/2026-11-08-nmc-facet-home-links.json'),result,'facet-home projection differs from source roles');
 console.log(JSON.stringify({status:'PASS',...result.totals,canonicalAcceptance:false}));
}else console.log(JSON.stringify(result,null,2));
