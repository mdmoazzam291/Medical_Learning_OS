import { validateCatalog } from './content.js';

// Authoring/QA projection only. Never serve this full-catalog projection to learners.
// Subject tags are views; only primary links indicate what an item assesses.
export function projectContentConnections(catalogInput, noteDrafts = []) {
  const catalog = validateCatalog(catalogInput);
  if (!Array.isArray(noteDrafts)) throw new TypeError('Expected note drafts');
  const keys = new Set();
  for (const note of noteDrafts) {
    if (!note || typeof note.noteKey !== 'string' || !note.noteKey.trim() || keys.has(note.noteKey)) {
      throw new TypeError('Invalid or duplicate note key');
    }
    keys.add(note.noteKey);
    if (!catalog.concepts.some(c => c.conceptId === note.conceptId)) throw new TypeError('Unknown note concept');
    if (note.status !== 'draft') throw new TypeError('Expected unpublished note draft');
    if (![note.title, note.bodyMarkdown, note.provenance?.evidence].every(v => typeof v === 'string' && v.trim()) ||
        note.provenance?.kind !== 'ai_generated_original') throw new TypeError('Invalid draft content/provenance');
    if (!Array.isArray(note.sourceIds) || !note.sourceIds.length ||
        new Set(note.sourceIds).size !== note.sourceIds.length ||
        note.sourceIds.some(id => !catalog.sources.some(s => s.sourceId === id))) {
      throw new TypeError('Unknown or duplicate note source');
    }
  }
  const concepts = catalog.concepts.map(concept => {
    const questions = catalog.questions.filter(q => q.status !== 'retired' &&
      q.conceptLinks.some(link => link.conceptId === concept.conceptId));
    const primary = questions.filter(q => q.conceptLinks.some(link =>
      link.conceptId === concept.conceptId && link.role === 'primary'));
    const questionIds = [...new Set(primary.map(q => q.questionId))].sort();
    const publishedIds = [...new Set(primary.filter(q => q.status === 'published').map(q => q.questionId))];
    return {
      conceptId: concept.conceptId,
      subjectTags: [...concept.subjectTags],
      noteKeys: noteDrafts.filter(n => n.conceptId === concept.conceptId).map(n => n.noteKey).sort(),
      primaryQuestionIds: questionIds,
      publishedPrimaryQuestionCount: publishedIds.length,
      publishedAlternatePairs: publishedIds.length < 2 ? 0 : publishedIds.length * (publishedIds.length - 1) / 2,
      questionLinks: questions.map(q => ({
        questionVersionId: q.questionVersionId,
        status: q.status,
        roles: q.conceptLinks.filter(link => link.conceptId === concept.conceptId).map(link => link.role)
      })).sort((a, b) => a.questionVersionId.localeCompare(b.questionVersionId))
    };
  });
  return {
    contractId: 'content-connections-authoring-v1',
    publicationAuthority: false,
    transferValidityEstablished: false,
    learnerEvidenceCreated: false,
    concepts
  };
}
