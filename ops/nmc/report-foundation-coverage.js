import {readFileSync, readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import catalogue from '../../data/nmc-reference-catalogue.json' with {type: 'json'};
import pack from '../../data/nmc-learning-foundation-drafts.json' with {type: 'json'};
import {validateFoundationDrafts} from '../../src/domain/nmc-learning-foundation.js';

const drafts = validateFoundationDrafts(pack, catalogue);
const proposedReferences = new Set(drafts.sourceBindings.map(binding => binding.referenceId));
const references = new Map(catalogue.references.map(row => [row.referenceId, row]));
const draftedReferences = new Set();
const packetDirectory = fileURLToPath(new URL('../../docs/evidence/', import.meta.url));
const packetFiles = readdirSync(packetDirectory).filter(name => name.endsWith('-draft-tasks.json'));

for (const name of packetFiles) {
  const packet = JSON.parse(readFileSync(new URL('../../docs/evidence/' + name, import.meta.url), 'utf8'));
  if (packet.sourceEdition !== catalogue.edition || packet.sourceSha256 !== catalogue.sourceSha256)
    throw new Error('packet_source_mismatch: ' + name);
  for (const row of packet.rows) {
    const reference = references.get(row.referenceId);
    if (!reference || reference.searchCode !== row.code || reference.pdfPage !== row.page ||
        reference.subjectId !== row.subjectId || reference.identifierState !== 'standard' ||
        reference.amendmentNotice || !reference.topicId)
      throw new Error('packet_reference_mismatch: ' + name);
    if (draftedReferences.has(row.referenceId)) throw new Error('duplicate_packet_reference: ' + name);
    draftedReferences.add(row.referenceId);
  }
}

const bySubject = new Map();
const emptyCounts = () => ({
  appearances: 0, withProposal: 0, needsSourceResolution: 0, withoutProposal: 0,
  withDraftOrProposal: 0, needsFirstDraft: 0,
});
const totals = emptyCounts();
for (const reference of catalogue.references) {
  if (!bySubject.has(reference.subjectId)) bySubject.set(reference.subjectId, emptyCounts());
  const counts = bySubject.get(reference.subjectId);
  const needsResolution = reference.identifierState !== 'standard' || reference.amendmentNotice || !reference.topicId;
  const category = proposedReferences.has(reference.referenceId)
    ? 'withProposal' : needsResolution ? 'needsSourceResolution' : 'withoutProposal';
  const hasDraft = proposedReferences.has(reference.referenceId) || draftedReferences.has(reference.referenceId);
  for (const group of [totals, counts]) {
    group.appearances++;
    group[category]++;
    if (hasDraft) group.withDraftOrProposal++;
    else if (!needsResolution) group.needsFirstDraft++;
  }
}

console.log(JSON.stringify({
  edition: catalogue.edition,
  draftVersion: drafts.draftVersion,
  approvedMappings: 0,
  packetFiles: packetFiles.length,
  firstDraftInventoryComplete: totals.needsFirstDraft === 0,
  adminApprovalRequiredForFoundationAuthoring: false,
  totals,
  subjects: Object.fromEntries(bySubject),
}, null, 2));
