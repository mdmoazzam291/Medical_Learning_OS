// Authoring-name links only. No canonical IDs, registry merges or learner changes.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../../',import.meta.url),read=p=>JSON.parse(readFileSync(new URL(p,root),'utf8'));
const roles=read('docs/evidence/2026-11-08-nmc-name-role-proposals.json');
const norm=s=>s.normalize('NFC').trim().toLowerCase(),byName=new Map(roles.entries.map(e=>[e.nameKey,e]));
assert.equal(byName.size,roles.entries.length);
const links=[],unresolved=[];
for(const facet of roles.entries.filter(e=>e.classificationRole==='scope-facet')){
 const homeKey=norm(facet.proposedHomeLabel),target=byName.get(homeKey);
 const source={facetNameKey:facet.nameKey,proposedHomeNameKey:homeKey,componentProposalIds:facet.occurrences.map(o=>o.componentProposalId),sourceReferenceIds:[...new Set(facet.occurrences.flatMap(o=>o.sourceReferenceIds))].sort()};
 if(target?.classificationRole==='reusable-name-candidate'){
  assert.notEqual(facet.nameKey,target.nameKey);
  links.push({...source,targetNameKey:target.nameKey,targetComponentProposalIds:target.occurrences.map(o=>o.componentProposalId),relation:'proposed-scope-facet-of-name-candidate',basis:'exact-normalized-editorial-home-label',semanticEquivalence:'unverified',canonicalConceptId:null,canonicalObjectiveVersionId:null,mappingAccepted:false});
 }else unresolved.push({...source,reason:target?'home-label-is-scope-facet':'home-label-has-no-name-candidate',canonicalConceptId:null});
}
links.sort((a,b)=>a.facetNameKey.localeCompare(b.facetNameKey));unresolved.sort((a,b)=>a.facetNameKey.localeCompare(b.facetNameKey));
const result={schemaVersion:1,status:'editorial-facet-home-link-proposals',sourceRolePath:'docs/evidence/2026-11-08-nmc-name-role-proposals.json',automaticMerging:false,clinicalApproval:false,learnerActivation:false,registryAcceptance:false,coverageFraction:null,totals:{classifiedNames:roles.entries.length,scopeFacets:links.length+unresolved.length,exactCandidateHomeLinks:links.length,unresolvedFacetHomes:unresolved.length,distinctCandidateHomes:new Set(links.map(l=>l.targetNameKey)).size},links,unresolved};
assert.equal(result.totals.scopeFacets,407);
if(process.argv.includes('--verify')){
 const saved=read('docs/evidence/2026-11-08-nmc-facet-home-links.json');
 assert.deepEqual(saved,result,'facet-home projection differs from exact source roles');
 console.log(JSON.stringify({status:'PASS',...result.totals,canonicalAcceptance:false}));
}else console.log(JSON.stringify(result,null,2));
