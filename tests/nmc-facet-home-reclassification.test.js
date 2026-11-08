import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, copyFileSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';

function runProjection(scopeFacets, {shared = false, mutate = () => {}} = {}) {
 const root = mkdtempSync(join(tmpdir(), 'nmc-home-role-'));
 try {
  mkdirSync(join(root, 'ops/nmc'), {recursive: true});
  mkdirSync(join(root, 'docs/evidence'), {recursive: true});
  writeFileSync(join(root, 'package.json'), JSON.stringify({type: 'module'}));
  const script = join(root, 'ops/nmc/report-facet-home-links.js');
  copyFileSync(new URL('../ops/nmc/report-facet-home-links.js', import.meta.url), script);
  const write = (name, value) => writeFileSync(join(root, 'docs/evidence', name), JSON.stringify(value));
  const flags = {clinicalApproval: false, learnerActivation: false, automaticMerging: false, productionRegistryChecked: false, canonicalIdentityAllocation: false};
  const roles = {
   totals: {scopeFacets}, entries: [
    {nameKey: 'synthetic topic', classificationRole: 'reusable-name-candidate', occurrences: [{componentProposalId: 'synthetic:topic', sourceReferenceIds: ['synthetic:topic-reference']}]},
    {nameKey: 'synthetic second topic', classificationRole: 'reusable-name-candidate', occurrences: [{componentProposalId: 'synthetic:second-topic', sourceReferenceIds: ['synthetic:second-topic-reference']}]},
    {nameKey: 'synthetic interpretation', classificationRole: 'scope-facet', proposedHomeLabel: shared ? 'Synthetic family' : 'Synthetic topic', occurrences: [{componentProposalId: 'synthetic:facet', sourceReferenceIds: ['synthetic:reference'], batchPath: 'docs/evidence/synthetic-components.json', parentNameKey: 'synthetic source task'}]}
   ]
  };
  const sourceTask = {referenceId: 'synthetic:reference', subjectId: 'synthetic', code: 'S1', page: 1, rowBBox: [0, 0, 1, 1], sourceBodySha256: 'a'.repeat(64), mode: 'knowledge'};
  write('synthetic-tasks.json', {rows: [sourceTask]});
  write('synthetic-components.json', {rows: [{parentNameKey: 'synthetic source task', sourceAppearances: [{referenceId: sourceTask.referenceId, packet: 'docs/evidence/synthetic-tasks.json'}]}]});
  const sharedPacket = {schemaVersion: 1, status: 'names-only-shared-facet-scope-proposals', ...flags, officialSourceRechecked: false, groups: shared ? [{
   facetNameKey: 'synthetic interpretation', componentProposalIds: ['synthetic:facet'], sourceReferenceIds: ['synthetic:reference'],
   targetNameKeys: ['synthetic second topic', 'synthetic topic'], basis: 'explicit-shared-source-task-context',
   canonicalConceptId: null, canonicalObjectiveVersionId: null, mappingAccepted: false, scopeComplete: false, targetCoverage: 'unverified',
   sourceTasks: [{...sourceTask, packetPath: 'docs/evidence/synthetic-tasks.json'}]
  }] : []};
  mutate({roles, sharedPacket});
  write('2026-11-08-nmc-name-role-proposals.json', roles);
  write('2026-11-08-nmc-shared-facet-scope-proposals.json', sharedPacket);
  write('2026-11-08-nmc-missing-home-proposals.json', {status: 'names-only-home-proposals', ...flags, totals: {homeNames: 0, facetBindings: 0}, homes: []});
  write('2026-11-08-nmc-home-label-resolutions.json', {status: 'names-only-home-label-resolutions', ...flags, resolutions: []});
  return spawnSync(process.execPath, [script], {encoding: 'utf8'});
 } finally { rmSync(root, {recursive: true, force: true}); }
}

test('home projection uses the current classified facet denominator after role changes', () => {
 const result = runProjection(1);
 assert.equal(result.status, 0, result.stderr);
 const graph = JSON.parse(result.stdout);
 assert.equal(graph.totals.scopeFacets, 1);
 assert.equal(graph.totals.totalFacetHomeLinks, 1);
 assert.equal(graph.links[0].canonicalConceptId, null);
 assert.equal(graph.links[0].mappingAccepted, false);
});

test('home projection rejects a declared facet denominator that differs from role entries', () => {
 const result = runProjection(0);
 assert.notEqual(result.status, 0);
 assert.match(result.stderr, /facet denominator differs from source roles/);
});

test('shared source scope retains two targets while accounting for its facet only once', () => {
 const result = runProjection(1, {shared: true});
 assert.equal(result.status, 0, result.stderr);
 const graph = JSON.parse(result.stdout);
 assert.equal(graph.schemaVersion, 2);
 assert.equal(graph.links.length, 0);
 assert.equal(graph.unresolved.length, 0);
 assert.equal(graph.sharedScopeGroups.length, 1);
 assert.equal(graph.sharedScopeGroups[0].targets.length, 2);
 assert.equal(graph.sharedScopeGroups[0].scopeComplete, false);
 assert.equal(graph.sharedScopeGroups[0].targetCoverage, 'unverified');
 assert.equal(graph.totals.scopeFacets, 1);
 assert.equal(graph.totals.sharedScopeFacetCount, 1);
 assert.equal(graph.totals.sharedScopeTargetLinks, 2);
});

for (const [name, mutate, error] of [
 ['duplicate targets', ({sharedPacket}) => { sharedPacket.groups[0].targetNameKeys[1] = sharedPacket.groups[0].targetNameKeys[0]; }, /duplicate shared-scope target/],
 ['altered source bindings', ({sharedPacket}) => { sharedPacket.groups[0].sourceReferenceIds = ['synthetic:wrong-reference']; }, /shared scope source drift/],
 ['forged acceptance', ({sharedPacket}) => { sharedPacket.groups[0].mappingAccepted = true; }, /shared scope is unaccepted/],
 ['overriding an existing single home', ({roles}) => { roles.entries[2].proposedHomeLabel = 'Synthetic topic'; }, /shared scope cannot override a single home/],
 ['unknown target names', ({sharedPacket}) => { sharedPacket.groups[0].targetNameKeys[1] = 'unknown topic'; }, /unknown reusable shared-scope target/],
 ['altered source task hashes', ({sharedPacket}) => { sharedPacket.groups[0].sourceTasks[0].sourceBodySha256 = 'b'.repeat(64); }, /shared scope task evidence drift/],
 ['omitted source task evidence', ({sharedPacket}) => { sharedPacket.groups[0].sourceTasks = []; }, /shared scope task evidence drift/]
]) test(`shared scope rejects ${name}`, () => {
 const result = runProjection(1, {shared: true, mutate});
 assert.notEqual(result.status, 0);
 assert.match(result.stderr, error);
});
