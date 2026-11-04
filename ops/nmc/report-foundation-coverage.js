import catalogue from '../../data/nmc-reference-catalogue.json' with {type: 'json'};
import pack from '../../data/nmc-learning-foundation-drafts.json' with {type: 'json'};
import {validateFoundationDrafts} from '../../src/domain/nmc-learning-foundation.js';

const drafts = validateFoundationDrafts(pack, catalogue);
const proposedReferences = new Set(drafts.sourceBindings.map(binding => binding.referenceId));
const bySubject = new Map();
const totals = {appearances: 0, withProposal: 0, needsSourceResolution: 0, withoutProposal: 0};

for (const reference of catalogue.references) {
  if (!bySubject.has(reference.subjectId)) {
    bySubject.set(reference.subjectId, {appearances: 0, withProposal: 0, needsSourceResolution: 0, withoutProposal: 0});
  }
  const counts = bySubject.get(reference.subjectId);
  const needsResolution = reference.identifierState !== 'standard' || reference.amendmentNotice || !reference.topicId;
  const category = proposedReferences.has(reference.referenceId)
    ? 'withProposal'
    : needsResolution ? 'needsSourceResolution' : 'withoutProposal';
  for (const group of [totals, counts]) {
    group.appearances++;
    group[category]++;
  }
}

console.log(JSON.stringify({
  edition: catalogue.edition,
  draftVersion: drafts.draftVersion,
  approvedMappings: 0,
  totals,
  subjects: Object.fromEntries(bySubject),
}, null, 2));
