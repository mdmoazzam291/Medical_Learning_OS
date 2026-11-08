import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, copyFileSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';

function runProjection(scopeFacets) {
 const root = mkdtempSync(join(tmpdir(), 'nmc-home-role-'));
 try {
  mkdirSync(join(root, 'ops/nmc'), {recursive: true});
  mkdirSync(join(root, 'docs/evidence'), {recursive: true});
  writeFileSync(join(root, 'package.json'), JSON.stringify({type: 'module'}));
  const script = join(root, 'ops/nmc/report-facet-home-links.js');
  copyFileSync(new URL('../ops/nmc/report-facet-home-links.js', import.meta.url), script);
  const write = (name, value) => writeFileSync(join(root, 'docs/evidence', name), JSON.stringify(value));
  const flags = {clinicalApproval: false, learnerActivation: false, automaticMerging: false, productionRegistryChecked: false, canonicalIdentityAllocation: false};
  write('2026-11-08-nmc-name-role-proposals.json', {
   totals: {scopeFacets}, entries: [
    {nameKey: 'synthetic topic', classificationRole: 'reusable-name-candidate', occurrences: [{componentProposalId: 'synthetic:topic'}]},
    {nameKey: 'synthetic interpretation', classificationRole: 'scope-facet', proposedHomeLabel: 'Synthetic topic', occurrences: [{componentProposalId: 'synthetic:facet', sourceReferenceIds: ['synthetic:reference']}]}
   ]
  });
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
