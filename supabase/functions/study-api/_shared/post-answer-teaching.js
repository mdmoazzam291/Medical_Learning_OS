const CONTRACT_ID = 'grounded-teaching-output';
const CONTRACT_VERSION = '1';
const ACTION = 'concise_explanation';
const WORD_CAP = 120;

function text(value, label, max = 1000) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) {
    throw new TypeError(`Invalid ${label}`);
  }
  return value.trim();
}

function wordCount(value) {
  return value.trim() ? value.trim().split(/\s+/u).length : 0;
}

function sourceRef(source) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return null;
  if (typeof source.sourceId !== 'string' || !source.sourceId.trim()) return null;
  const version = typeof source.version === 'string' && source.version.trim()
    ? source.version.trim()
    : null;
  return {
    type: 'content-source',
    id: source.sourceId.trim(),
    version
  };
}

function uniqueReferences(sources) {
  const seen = new Set();
  const refs = [];
  for (const source of sources) {
    const ref = sourceRef(source);
    if (!ref) continue;
    const key = `${ref.type}\u0000${ref.id}\u0000${ref.version ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    refs.push(ref);
  }
  return refs;
}

export function buildCanonicalPostAnswerTeaching({
  correct,
  conceptId,
  explanation,
  sources
}) {
  if (correct === true) return null;
  if (correct !== false) throw new TypeError('Invalid correctness');
  const concept = text(conceptId, 'conceptId', 240);
  const canonicalExplanation = text(explanation, 'explanation', 5000);
  if (!Array.isArray(sources)) throw new TypeError('Invalid sources');

  const citationRefs = uniqueReferences(sources);
  if (!citationRefs.length) return null;

  const headline = 'Review the canonical reasoning.';
  const nextPrompt = 'Before moving on, state the rule in your own words.';
  const words = wordCount(headline) + wordCount(canonicalExplanation) + wordCount(nextPrompt);
  if (words > WORD_CAP) return null;

  return Object.freeze({
    decision: Object.freeze({
      policyId: 'post-answer-canonical-v1',
      policyVersion: '1',
      trigger: 'incorrect_answer',
      teachingAction: ACTION
    }),
    teaching: Object.freeze({
      schemaVersion: 1,
      contractId: CONTRACT_ID,
      contractVersion: CONTRACT_VERSION,
      renderStatus: 'ready',
      sourceMode: 'canonical_fallback',
      teachingAction: ACTION,
      conceptId: concept,
      headline,
      claims: Object.freeze([
        Object.freeze({
          claimId: 'canonical-explanation',
          role: 'explanation',
          text: canonicalExplanation,
          citationRefs: Object.freeze(citationRefs.map(ref => Object.freeze({ ...ref })))
        })
      ]),
      misconceptionCorrection: null,
      nextPrompt,
      abstentionReason: null
    })
  });
}
