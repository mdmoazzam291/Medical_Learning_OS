import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, copyFileSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';

function run(mutate) {
 const root = mkdtempSync(join(tmpdir(), 'nmc-parent-reuse-'));
 try {
  mkdirSync(join(root, 'ops/nmc'), {recursive: true}); mkdirSync(join(root, 'docs/evidence'), {recursive: true});
  writeFileSync(join(root, 'package.json'), JSON.stringify({type: 'module'}));
  const script = join(root, 'ops/nmc/report-parent-name-reuse.js');
  copyFileSync(new URL('../ops/nmc/report-parent-name-reuse.js', import.meta.url), script);
  const encode = value => JSON.stringify(value);
  const write = (name, value) => writeFileSync(join(root, 'docs/evidence', name), encode(value));
  const flags = {clinicalApproval: false, learnerActivation: false, automaticMerging: false, productionRegistryChecked: false, canonicalIdentityAllocation: false, officialSourceRechecked: false};
  const appearance = referenceId => ({referenceId, subjectId: 'synthetic', code: referenceId, pdfPage: 1, packet: 'docs/evidence/synthetic-tasks.json', proposedObjectiveVersionIds: []});
  const current = appearance('new'), previous = appearance('old');
  const index = {names: [{nameKey: 'synthetic topic', appearances: [current]}, {nameKey: 'synthetic compound', appearances: [previous]}]};
  const indexText = encode(index);
  writeFileSync(join(root, 'docs/evidence/2026-11-08-nmc-foundation-names-only-index.json'), indexText);
  write('2026-11-08-nmc-unassessed-parent-reuse-triage.json', {status: 'names-only-unassessed-parent-reuse-triage', ...flags, sourceIndexSha256: createHash('sha256').update(indexText).digest('hex'), matches: [{parentNameKey: 'synthetic topic', sourceAppearances: [current], targetKind: 'existing-component-name-candidate', targetNameKey: 'synthetic topic', targetComponentProposalIds: ['component:old']}]});
  write('2026-11-08-nmc-name-role-proposals.json', {entries: [{nameKey: 'synthetic topic', classificationRole: 'reusable-name-candidate', occurrences: [{componentProposalId: 'component:old', sourceReferenceIds: ['old']}]}]});
  write('2026-11-08-nmc-missing-home-proposals.json', {homes: []});
  write('synthetic-tasks.json', {rows: ['new', 'old'].map(referenceId => ({referenceId, subjectId: 'synthetic', code: referenceId, page: 1, rowBBox: [0, 0, 1, 1], sourceBodySha256: referenceId === 'new' ? 'a'.repeat(64) : 'b'.repeat(64), mode: referenceId === 'new' ? 'performance-and-knowledge' : 'knowledge', draftLearningTask: `${referenceId} synthetic task`}))});
  const result = spawnSync(process.execPath, [script], {encoding: 'utf8'});
  assert.equal(result.status, 0, result.stderr);
  const packet = JSON.parse(result.stdout);
  if (!mutate) return packet;
  mutate(packet);
  write('2026-11-08-nmc-parent-name-reuse-proposals.json', packet);
  return spawnSync(process.execPath, [script, '--verify'], {encoding: 'utf8'});
 } finally { rmSync(root, {recursive: true, force: true}); }
}

test('parent name reuse retains distinct source tasks and assessment modes without equivalence', () => {
 const packet = run();
 assert.equal(packet.rows.length, 1);
 const row = packet.rows[0];
 assert.equal(row.reuseLevel, 'editorial-name-only');
 assert.equal(row.semanticEquivalence, 'unverified');
 assert.equal(row.mappingAccepted, false);
 assert.equal(row.taskEquivalenceAccepted, false);
 assert.equal(row.boundarySignals.assessmentModeSetsDiffer, true);
 assert.notEqual(row.sourceTasks[0].editorialTaskSha256, row.targetSourceTasks[0].editorialTaskSha256);
 assert.equal(row.sourceTasks[0].mode, 'performance-and-knowledge');
 assert.equal(row.targetSourceTasks[0].mode, 'knowledge');
});

for (const [name, mutate] of [
 ['changed source hashes', packet => { packet.rows[0].sourceTasks[0].sourceBodySha256 = 'c'.repeat(64); }],
 ['forged task equivalence', packet => { packet.rows[0].taskEquivalenceAccepted = true; }],
 ['omitted rows with adjusted counts', packet => { packet.rows = []; packet.totals.parentNames = 0; }]
]) test(`parent reuse verification rejects ${name}`, () => {
 const result = run(mutate);
 assert.notEqual(result.status, 0);
 assert.match(result.stderr, /parent reuse projection differs from evidence/);
});
