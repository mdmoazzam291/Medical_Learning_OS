// Exact-label triage. Shared wording is a review lead, not a canonical mapping.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const root = new URL('../../', import.meta.url);
const prefix = 'docs/evidence/2026-11-08-nmc-';
const queue = prefix + 'parent-follow-up-queue.json';
const output = prefix + 'standalone-topic-reuse-triage.json';
const inputs = [
  ['foundation-names-only-index.json', 'names', n => n.appearances.map(a => a.referenceId)],
  ['name-role-proposals.json', 'entries', n => n.occurrences.flatMap(o => o.sourceReferenceIds)],
  ['missing-home-proposals.json', 'homes', n => n.facetBindings.flatMap(b => b.sourceReferenceIds)],
];
const normalize = name => name.trim().replace(/\s+/gu, ' ').toLowerCase();
const hash = value => createHash('sha256').update(value).digest('hex');
const raw = path => readFileSync(new URL(path, root), 'utf8');
const read = path => JSON.parse(raw(path));
const lookup = new Map();
const packets = new Map();
const scopedBatches = Array.from({length: 21}, (_, index) =>
  prefix + 'scoped-task-home-proposals-batch-' + String(index + 1).padStart(2, '0') + '.json');

for (const [file, field, references] of inputs) {
  const path = prefix + file;
  for (const entry of read(path)[field]) {
    const key = normalize(entry.name ?? entry.nameKey);
    const matches = lookup.get(key) ?? [];
    matches.push({path, nameKey: entry.nameKey, sourceReferenceIds: [...new Set(references(entry))].sort()});
    lookup.set(key, matches);
  }
}

for (const path of scopedBatches) {
  for (const row of read(path).rows) {
    const matches = lookup.get(row.proposedHomeNameKey) ?? [];
    matches.push({path, nameKey: row.proposedHomeNameKey, proposalId: row.proposalId,
      sourceReferenceIds: row.sourceTasks.map(task => task.referenceId)});
    lookup.set(row.proposedHomeNameKey, matches);
  }
}

const cohort = read(queue).rows.filter(row => row.nextAction === 'check-semantic-reuse-and-bind-topic');
assert.equal(cohort.length, 570);
assert.equal(new Set(cohort.map(row => row.parentNameKey)).size, cohort.length);
const rows = cohort.map(row => {
  const ownRefs = new Set(row.sourceTasks.map(task => task.referenceId));
  for (const task of row.sourceTasks) {
    if (!packets.has(task.packetPath)) packets.set(task.packetPath, read(task.packetPath).rows);
    const matches = packets.get(task.packetPath).filter(entry => entry.referenceId === task.referenceId);
    assert.equal(matches.length, 1);
    assert.equal(hash(matches[0].draftLearningTask), task.editorialTaskSha256);
    for (const field of ['subjectId', 'code', 'page', 'rowBBox', 'sourceBodySha256', 'mode']) {
      assert.deepEqual(matches[0][field], task[field]);
    }
  }
  const exactLabelMatches = (lookup.get(normalize(row.name)) ?? []).map(match => ({
    ...match,
    additionalSourceReferenceIds: match.sourceReferenceIds.filter(ref => !ownRefs.has(ref)),
  }));
  const triage = exactLabelMatches.some(match => match.additionalSourceReferenceIds.length)
    ? 'additional-source-exact-label-lead'
    : exactLabelMatches.length ? 'same-source-label-only' : 'no-exact-label-match';
  return {topicName: row.name, topicNameKey: row.parentNameKey, sourceReferenceIds: [...ownRefs],
    exactLabelMatches, triage, semanticEquivalence: 'unverified', mappingAccepted: false,
    canonicalConceptId: null, canonicalObjectiveVersionId: null};
});
const totals = {};
for (const row of rows) totals[row.triage] = (totals[row.triage] ?? 0) + 1;
const report = {schemaVersion: 1, status: 'standalone-topic-exact-label-triage',
  inputDigests: [queue, ...inputs.map(([file]) => prefix + file), ...scopedBatches].map(path => ({path, sha256: hash(raw(path))})),
  totals: {topics: rows.length, sourceAppearances: rows.reduce((count, row) => count + row.sourceReferenceIds.length, 0), ...totals},
  rows};
if (process.argv.includes('--verify')) {
  assert.deepEqual(read(output), report);
  console.log(JSON.stringify(report.totals));
} else {
  console.log(JSON.stringify(report, null, 2));
}
