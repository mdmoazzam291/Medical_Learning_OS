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

const exceptionPath = new URL('../../docs/evidence/2026-11-07-nmc-source-exception-task-packet.json', import.meta.url);
const exceptions = JSON.parse(readFileSync(exceptionPath, 'utf8'));
if (exceptions.sourceEdition !== catalogue.edition || exceptions.sourceSha256 !== catalogue.sourceSha256 ||
    exceptions.status !== 'original-tasks-for-editorial-source-exceptions' ||
    exceptions.clinicalApproval !== false || exceptions.learnerActivation !== false)
  throw new Error('exception_packet_invalid');
const exceptionReferences = new Set();
for (const row of exceptions.rows) {
  const reference = references.get(row.referenceId);
  if (!reference || reference.searchCode !== row.code || reference.pdfPage !== row.page ||
      reference.subjectId !== row.subjectId || reference.amendmentNotice ||
      (reference.identifierState === 'standard' && reference.topicId !== null) ||
      exceptionReferences.has(row.referenceId) || draftedReferences.has(row.referenceId) ||
      typeof row.draftLearningTask !== 'string' || !row.draftLearningTask.trim())
    throw new Error('exception_reference_invalid');
  exceptionReferences.add(row.referenceId);
}
const replacementCodes = new Set();
for (const replacement of exceptions.officialReplacementTasks) {
  if (!['PY9.1', 'PE6.4'].includes(replacement.code) || replacementCodes.has(replacement.code) ||
      replacement.amendmentSource !== catalogue.clarificationUrl || replacement.amendmentPdfPage !== 3 ||
      !Array.isArray(replacement.draftLearningTasks) || !replacement.draftLearningTasks.length ||
      replacement.draftLearningTasks.some(task => typeof task !== 'string' || !task.trim()))
    throw new Error('replacement_scope_invalid');
  replacementCodes.add(replacement.code);
}
if (replacementCodes.size !== 2 || exceptions.deletedReference.code !== 'PS9.2' ||
    exceptions.deletedReference.disposition !== 'historical-reference-only' ||
    exceptions.deletedReference.amendmentSource !== catalogue.clarificationUrl ||
    exceptions.deletedReference.amendmentPdfPage !== 3)
  throw new Error('official_dispositions_invalid');
const accounted = reference => proposedReferences.has(reference.referenceId) ||
  draftedReferences.has(reference.referenceId) || exceptionReferences.has(reference.referenceId) ||
  (reference.amendmentNotice && (replacementCodes.has(reference.searchCode) || reference.searchCode === 'PS9.2'));
const missingDisposition = catalogue.references.filter(reference => !accounted(reference));

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
  allSourceAppearancesAccountedFor: missingDisposition.length === 0,
  sourceAccounting: {
    regularDrafts: draftedReferences.size,
    editorialExceptionDrafts: exceptionReferences.size,
    officialReplacements: replacementCodes.size,
    officialDeletions: 1,
    missingDispositions: missingDisposition.map(reference => reference.referenceId),
    componentCoverage: 'unverified',
  },
  totals,
  subjects: Object.fromEntries(bySubject),
}, null, 2));
