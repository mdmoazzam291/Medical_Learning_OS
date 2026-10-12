import { questionSignature, questionAnswer, questionHome } from './content-library.js';

// Read-only inspection of uploader-declared material. The canonical server remains the
// authority for existing-catalog deduplication, source rights and publication receipts.
export function intakeIntegrityReport(manifest) {
  if (!manifest || !Array.isArray(manifest.questions) || !Array.isArray(manifest.notes)) throw new TypeError('manifest_required');
  const families = new Map();
  const homes = { pyq: 0, platform: 0, original: 0 };
  let pyqOccurrences = 0, crossPlatformDeclared = 0, platformSourcesSuppressed = 0, repeatedPyqOccurrenceClaims = 0;
  for (const q of manifest.questions) {
    const home = questionHome(q.origins || []);
    homes[home.kind] += 1;
    const pyq = (q.origins || []).filter(o => o.kind === 'pyq');
    const platform = (q.origins || []).filter(o => o.kind === 'platform');
    pyqOccurrences += pyq.length;
    if (pyq.length && platform.length) crossPlatformDeclared++;
    if (platform.length) platformSourcesSuppressed += Math.max(0, new Set(platform.map(o => o.platformId)).size - (home.kind === 'platform' ? 1 : 0));
    const occurrences = new Set(pyq.map(o => JSON.stringify([o.examId, o.year, o.session])));
    repeatedPyqOccurrenceClaims += pyq.length - occurrences.size;
    const signature = questionSignature(q);
    if (!families.has(signature)) families.set(signature, []);
    families.get(signature).push({ questionId: q.questionId, answer: questionAnswer(q), pyqOccurrences: pyq.map(o => ({ examId: o.examId, year: o.year, session: o.session })) });
  }
  const duplicates = [...families.values()].filter(items => items.length > 1).map(items => ({
    questionIds: items.map(q => q.questionId),
    answerConflict: new Set(items.map(q => q.answer)).size > 1,
    declaredPyqOccurrences: items.flatMap(q => q.pyqOccurrences)
  }));
  const sourceIds = new Set((manifest.sources || []).map(s => s.sourceId));
  const conceptIds = new Set((manifest.concepts || []).map(c => c.conceptId));
  const externallyReferencedSources = new Set();
  const externallyReferencedConcepts = new Set();
  for (const q of manifest.questions) {
    for (const id of q.sourceIds || []) if (!sourceIds.has(id)) externallyReferencedSources.add(id);
    for (const link of q.conceptLinks || []) if (!conceptIds.has(link.conceptId)) externallyReferencedConcepts.add(link.conceptId);
  }
  for (const n of manifest.notes) {
    for (const id of n.sourceIds || []) if (!sourceIds.has(id)) externallyReferencedSources.add(id);
    if (!conceptIds.has(n.conceptId)) externallyReferencedConcepts.add(n.conceptId);
  }
  return {
    questionCount: manifest.questions.length,
    noteCount: manifest.notes.length,
    homes,
    pyqOccurrences,
    crossPlatformDeclared,
    platformSourcesSuppressed,
    repeatedPyqOccurrenceClaims,
    duplicateFamilies: duplicates,
    externallyReferencedSources: [...externallyReferencedSources].sort(),
    externallyReferencedConcepts: [...externallyReferencedConcepts].sort(),
    scope: 'manifest_only_declared_unverified'
  };
}
