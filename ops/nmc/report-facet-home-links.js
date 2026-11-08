// Authoring-name links only. Home proposals never allocate canonical identities.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../../',import.meta.url),read=p=>JSON.parse(readFileSync(new URL(p,root),'utf8'));
const roles=read('docs/evidence/2026-11-08-nmc-name-role-proposals.json');
const proposals=read('docs/evidence/2026-11-08-nmc-missing-home-proposals.json');
const norm=s=>s.normalize('NFC').trim().toLowerCase(),byName=new Map(roles.entries.map(e=>[e.nameKey,e]));
assert.equal(byName.size,roles.entries.length);
assert.equal(proposals.status,'names-only-home-proposals');
for(const k of ['clinicalApproval','learnerActivation','automaticMerging','productionRegistryChecked','canonicalIdentityAllocation'])assert.equal(proposals[k],false);
const homes=new Map(),homeIds=new Set();let boundFacets=0;
for(const h of proposals.homes){
 assert.equal(h.nameKey,norm(h.name));assert(!homes.has(h.nameKey));assert(!homeIds.has(h.homeProposalId));
 assert(h.homeProposalId.startsWith('editorial-home:'));homeIds.add(h.homeProposalId);
 assert(!byName.has(h.nameKey),'reuse an existing name instead of adding a home');
 for(const k of ['canonicalConceptId','canonicalObjectiveVersionId','coverageFraction'])assert.equal(h[k],null);
 for(const k of ['identityAccepted','mappingAccepted','scopeComplete'])assert.equal(h[k],false);
 assert.equal(h.basis,'existing-proposed-home-label-and-bound-facet-context');
 const expected=roles.entries.filter(e=>e.classificationRole==='scope-facet'&&norm(e.proposedHomeLabel)===h.nameKey).map(e=>({facetNameKey:e.nameKey,componentProposalIds:e.occurrences.map(o=>o.componentProposalId),sourceReferenceIds:[...new Set(e.occurrences.flatMap(o=>o.sourceReferenceIds))].sort()}));
 assert(expected.length>0);assert.deepEqual(h.facetBindings,expected,'home source bindings changed');
 homes.set(h.nameKey,h);boundFacets+=expected.length;
}
assert.deepEqual(proposals.totals,{homeNames:homes.size,facetBindings:boundFacets});
const links=[],unresolved=[];
for(const facet of roles.entries.filter(e=>e.classificationRole==='scope-facet')){
 const homeKey=norm(facet.proposedHomeLabel),target=byName.get(homeKey),home=homes.get(homeKey);
 const source={facetNameKey:facet.nameKey,proposedHomeNameKey:homeKey,componentProposalIds:facet.occurrences.map(o=>o.componentProposalId),sourceReferenceIds:[...new Set(facet.occurrences.flatMap(o=>o.sourceReferenceIds))].sort()};
 const flags={semanticEquivalence:'unverified',canonicalConceptId:null,canonicalObjectiveVersionId:null,mappingAccepted:false};
 if(target?.classificationRole==='reusable-name-candidate'){
  assert.notEqual(facet.nameKey,target.nameKey);
  links.push({...source,targetNameKey:target.nameKey,targetComponentProposalIds:target.occurrences.map(o=>o.componentProposalId),relation:'proposed-scope-facet-of-name-candidate',basis:'exact-normalized-editorial-home-label',...flags});
 }else if(home){
  links.push({...source,targetNameKey:home.nameKey,targetHomeProposalId:home.homeProposalId,relation:'proposed-scope-facet-of-home-proposal',basis:'exact-normalized-declared-home-label',...flags});
 }else unresolved.push({...source,reason:target?'home-label-is-scope-facet':'home-label-has-no-name-candidate',canonicalConceptId:null});
}
links.sort((a,b)=>a.facetNameKey.localeCompare(b.facetNameKey));unresolved.sort((a,b)=>a.facetNameKey.localeCompare(b.facetNameKey));
const result={schemaVersion:1,status:'editorial-facet-home-link-proposals',sourceRolePath:'docs/evidence/2026-11-08-nmc-name-role-proposals.json',sourceHomeProposalPath:'docs/evidence/2026-11-08-nmc-missing-home-proposals.json',automaticMerging:false,clinicalApproval:false,learnerActivation:false,registryAcceptance:false,coverageFraction:null,totals:{classifiedNames:roles.entries.length,scopeFacets:links.length+unresolved.length,exactCandidateHomeLinks:links.filter(l=>l.targetComponentProposalIds).length,proposedNewHomeLinks:links.filter(l=>l.targetHomeProposalId).length,totalFacetHomeLinks:links.length,unresolvedFacetHomes:unresolved.length,distinctCandidateHomes:new Set(links.map(l=>l.targetNameKey)).size},links,unresolved};
assert.equal(result.totals.scopeFacets,407);
if(process.argv.includes('--verify')){
 assert.deepEqual(read('docs/evidence/2026-11-08-nmc-facet-home-links.json'),result,'facet-home projection differs from source roles');
 console.log(JSON.stringify({status:'PASS',...result.totals,canonicalAcceptance:false}));
}else console.log(JSON.stringify(result,null,2));
