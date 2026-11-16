// Offline editorial routing only; this does not establish canonical relationships.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root = new URL('../../', import.meta.url);
const read = path => JSON.parse(readFileSync(new URL(path, root), 'utf8'));
const queuePath = 'docs/evidence/2026-11-08-nmc-home-scope-gap-queue.json';
const packet = read('docs/evidence/2026-11-08-nmc-home-scope-dispositions.json');
const queue = read(queuePath);
const roles = read('docs/evidence/2026-11-08-nmc-name-role-proposals.json');
assert.equal(packet.schemaVersion, 1);
assert.equal(packet.status, 'names-only-editorial-scope-dispositions');
assert.equal(packet.sourceQueuePath, queuePath);
for (const key of ['clinicalApproval', 'learnerActivation', 'automaticMerging', 'canonicalIdentityAllocation', 'officialSourceRechecked', 'productionRegistryChecked']) assert.equal(packet[key], false);
assert.equal(packet.coverageFraction, null);
const types = new Set(['care-context', 'professional-context', 'procedure-family', 'clinical-family', 'mixed-clinical-context', 'mixed-wound-context']);
const relations = new Set(['context-only', 'family-scope-pending', 'specific-home-scope-pending', 'cross-cutting-scope-pending']);
const groups = new Set(); let facets = 0; const relationCounts = {};
for (const row of packet.rows) {
 assert(!groups.has(row.proposedHomeNameKey)); groups.add(row.proposedHomeNameKey);
 const source = queue.rows.find(r => r.proposedHomeNameKey === row.proposedHomeNameKey); assert(source, 'unknown queue group');
 assert(types.has(row.organizerType));
 assert.equal(row.dispositionStatus, 'editorial-routing-proposed');
 assert.equal(row.canonicalConceptId, null); assert.equal(row.canonicalObjectiveVersionId, null);
 assert.equal(row.mappingAccepted, false); assert.equal(row.scopeComplete, false);
 assert.equal(row.organizerIsCanonicalConcept, false);
 assert.equal(row.facets.length, source.facets.length);
 assert.deepEqual(row.facets.map(({routing, ...binding}) => binding), source.facets, 'facet source projection drift');
 const expectedSources = new Map();
 for (const facet of row.facets) {
  assert(relations.has(facet.routing)); facets++;
  relationCounts[facet.routing] = (relationCounts[facet.routing] ?? 0) + 1;
  if (['care-context', 'professional-context'].includes(row.organizerType)) assert.equal(facet.routing, 'context-only');
  if (['procedure-family', 'clinical-family'].includes(row.organizerType)) assert.equal(facet.routing, 'family-scope-pending');
  for (const componentId of facet.componentProposalIds) {
   const role = roles.entries.find(e => e.nameKey === facet.facetNameKey); assert(role);
   const occurrence = role.occurrences.find(o => o.componentProposalId === componentId); assert(occurrence);
   const batch = read(occurrence.batchPath);
   const parent = batch.rows.find(r => r.parentNameKey === occurrence.parentNameKey); assert(parent);
   for (const appearance of parent.sourceAppearances.filter(s => facet.sourceReferenceIds.includes(s.referenceId))) {
    const sourcePacket = read(appearance.packet);
    const matches = [];
    const walk = value => {
     if (Array.isArray(value)) value.forEach(walk);
     else if (value && typeof value === 'object') {
      if (value.referenceId === appearance.referenceId && value.sourceBodySha256) matches.push(value);
      else Object.values(value).forEach(walk);
     }
    };
    walk(sourcePacket); assert.equal(matches.length, 1, 'ambiguous source task');
    const task = matches[0];
    expectedSources.set(task.referenceId, {referenceId: task.referenceId, packetPath: appearance.packet, subjectId: task.subjectId, code: task.code, page: task.page, rowBBox: task.rowBBox, sourceBodySha256: task.sourceBodySha256, mode: task.mode});
   }
  }
 }
 const expectedIds = [...new Set(source.facets.flatMap(f => f.sourceReferenceIds))].sort();
 assert.deepEqual([...expectedSources.keys()].sort(), expectedIds, 'source task omission');
 assert.deepEqual(row.sourceTasks, [...expectedSources.values()].sort((a,b) => a.referenceId.localeCompare(b.referenceId)), 'source task metadata drift');
}
assert.deepEqual([...groups].sort(), queue.rows.map(r => r.proposedHomeNameKey).sort(), 'group omission');
assert.deepEqual(packet.totals, {groups: groups.size, facets, relationCounts});
assert.equal(facets, queue.totals.facets);
console.log(JSON.stringify({status: 'PASS', ...packet.totals, canonicalAcceptance: false, semanticValidation: false}));
