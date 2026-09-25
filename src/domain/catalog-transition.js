import { isDeepStrictEqual } from 'node:util';
import { validateCatalog } from './content.js';

export class CatalogTransitionError extends Error {
  constructor(code) { super(code); this.code = code; }
}
const fail = code => { throw new CatalogTransitionError(code); };

// Reject edits to prior source/question evidence while allowing append-only
// reviews and forward lifecycle transitions. Used by both storage adapters.
export function validateCatalogTransition(previousInput, nextInput) {
  const previous = validateCatalog(previousInput), next = validateCatalog(nextInput);
  for (const source of previous.sources) {
    if (!isDeepStrictEqual(next.sources.find(s => s.sourceId === source.sourceId), source)) fail('source_history_is_immutable');
  }
  const states = ['draft', 'in_review', 'verified', 'published', 'retired'];
  for (const old of previous.questions) {
    const q = next.questions.find(candidate => candidate.questionVersionId === old.questionVersionId);
    const content = ({ status, reviews, publishedAt, ...rest }) => rest;
    if (!q || !isDeepStrictEqual(content(old), content(q)) ||
      old.reviews.some(r => !q.reviews.some(n => isDeepStrictEqual(n, r))) ||
      (old.publishedAt !== null && old.publishedAt !== q.publishedAt) ||
      states.indexOf(q.status) < states.indexOf(old.status)) fail('question_history_is_immutable');
  }
  for (const concept of previous.concepts) if (!next.concepts.some(c => c.conceptId === concept.conceptId))
    fail('concept_history_required');
  return next;
}
