import { digestCanonical } from './canonical-integrity.js';
import { validateAtomicClaimCandidate, buildSourceGroundedVerificationPacket } from './source-grounded-verification.js';

// An inspection index, never a review decision or publication projection.
export async function buildReferencesWorkspace(pilot, items) {
  if (pilot?.schemaVersion !== 1 || !Array.isArray(pilot.questions)) throw new TypeError('Invalid grounding pilot');
  const queue = new Map(items.map(item => [item.question?.questionVersionId, item]));
  const groups = new Map();
  const unavailable = [];
  const seen = new Set();
  for (const target of pilot.questions) {
    if (seen.has(target.questionVersionId)) throw new TypeError('Duplicate pilot question');
    seen.add(target.questionVersionId);
    const item = queue.get(target.questionVersionId);
    if (!item) continue;
    const claims = target.claims.map(validateAtomicClaimCandidate);
    const primary = item.question.conceptLinks?.find(link => link.role === 'primary')?.conceptId;
    const sources = item.sources || [];
    const matches = primary === target.primaryConceptId && claims.every(claim =>
      claim.evidence.every(evidence => sources.some(source =>
        source.sourceId === evidence.sourceId && source.version === evidence.sourceVersion)));
    if (!matches) {
      unavailable.push({ questionVersionId: target.questionVersionId, reason: 'Current concept/source version differs or is missing. Reassemble evidence before reuse.' });
      continue;
    }
    const packet = await buildSourceGroundedVerificationPacket({
      schemaVersion: 1, questionVersionId: target.questionVersionId,
      primaryConceptId: target.primaryConceptId, claims,
      deterministicChecks: pilot.deterministicChecks
    });
    for (const claim of claims) {
      const binding = await digestCanonical(claim);
      const key = binding.digestHex;
      const group = groups.get(key) || {
        bindingDigest: key, claim, questions: [], productionHumanReviewRequired: true,
        publicationAuthority: false
      };
      group.questions.push({ questionVersionId: target.questionVersionId, riskLane: packet.riskLane });
      groups.set(key, group);
    }
  }
  const claims = [...groups.values()].sort((a, b) => b.questions.length - a.questions.length || a.claim.claimId.localeCompare(b.claim.claimId));
  return {
    pilotId: pilot.pilotId, claims, unavailable,
    questionCount: new Set(claims.flatMap(group => group.questions.map(q => q.questionVersionId))).size,
    claimQuestionLinks: claims.reduce((sum, group) => sum + group.questions.length, 0),
    uniqueClaimCount: claims.length,
    publicationAuthority: false, productionHumanReviewRequired: true
  };
}
