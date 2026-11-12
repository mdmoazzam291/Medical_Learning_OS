import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../../',import.meta.url),read=p=>JSON.parse(readFileSync(new URL(p,root),'utf8'));
const queue=read('docs/evidence/2026-11-08-nmc-home-scope-gap-queue.json'),graph=read('docs/evidence/2026-11-08-nmc-facet-home-links.json');
assert.equal(queue.status,'names-only-home-scope-gap-queue');
for(const k of ['clinicalApproval','learnerActivation','automaticMerging','canonicalIdentityAllocation'])assert.equal(queue[k],false);
const expected=new Map();for(const f of graph.unresolved){if(!expected.has(f.proposedHomeNameKey))expected.set(f.proposedHomeNameKey,[]);expected.get(f.proposedHomeNameKey).push({facetNameKey:f.facetNameKey,componentProposalIds:f.componentProposalIds,sourceReferenceIds:f.sourceReferenceIds});}
const names=new Set();let facets=0;
for(const row of queue.rows){
 assert(!names.has(row.proposedHomeNameKey));names.add(row.proposedHomeNameKey);
 assert.equal(row.status,'scope-decision-pending');assert.equal(row.canonicalConceptId,null);assert.equal(row.mappingAccepted,false);assert.equal(row.scopeComplete,false);
 assert(['cross-cutting-outcome-under-specific-home','mixed-clinical-scope','generic-disease-or-function-family','procedure-family-scope','care-or-professional-context'].includes(row.reason));
 assert.deepEqual(row.facets,expected.get(row.proposedHomeNameKey),'unresolved scope evidence mismatch');facets+=row.facets.length;
}
assert.deepEqual([...names].sort(),[...expected.keys()].sort(),'gap group omission');
assert.deepEqual(queue.totals,{groups:names.size,facets});assert.equal(facets,graph.totals.unresolvedFacetHomes);
console.log(JSON.stringify({status:'PASS',groups:names.size,facets,canonicalAcceptance:false}));
