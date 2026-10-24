// Read-only historical boundary. Retirement never implies archive permission.
const idPattern = /^[a-zA-Z0-9:_@.\-]{1,160}$/;
const rightsStatuses = new Set(['owned', 'licensed', 'public_domain', 'citation_only']);
export async function readLearnerAttemptReview({ admin, learnerId, attemptId, search = '', getCatalog, trustedRead = (_operation, read) => read() }) {
  if (search) throw new Error('query_not_supported');
  if (typeof learnerId !== 'string' || !learnerId) throw new Error('learner_required');
  if (typeof attemptId !== 'string' || !idPattern.test(attemptId)) throw new Error('invalid_identifier');
  const {data: row, error} = await trustedRead('attempt_review', () => admin.from('study_attempts')
    .select('id,learner_id,event,receipt,recorded_at,presentation')
    .eq('id', attemptId).eq('learner_id', learnerId).maybeSingle());
  if (error) throw new Error('attempt_review_read_failed');
  if (!row || row.id !== attemptId || row.learner_id !== learnerId) throw new Error('attempt_not_found');
  const event = row.event, receipt = row.receipt, recordedEvent = receipt?.event;
  if (!event || !recordedEvent || event.eventId !== attemptId || event.learnerId !== learnerId ||
      typeof event.questionVersionId !== 'string' || typeof event.correct !== 'boolean' ||
      ['eventId','learnerId','questionVersionId','conceptId','correct','occurredAt','durationMs'].some(key => recordedEvent[key] !== event[key])) {
    throw new Error('attempt_evidence_invalid');
  }
  const attempt = {
    attemptId, questionVersionId: event.questionVersionId, conceptId: event.conceptId,
    correct: event.correct, occurredAt: event.occurredAt, durationMs: event.durationMs,
    recordedAt: row.recorded_at
  };
  const result = {contractId:'learner-attempt-review-v1', attempt, availability:'restricted', reason:'content_not_available_for_review', question:null, receipt:null, rescored:false};
  // A concise/visual presentation needs its own frozen presentation retrieval contract.
  if (row.presentation && row.presentation.representation !== 'original') return result;
  const catalog = (await getCatalog())?.body;
  if (catalog?.schemaVersion !== 1) throw new Error('attempt_review_read_failed');
  const matches = (Array.isArray(catalog?.questions) ? catalog.questions : []).filter(q => q?.questionVersionId === event.questionVersionId);
  const q = matches.length === 1 ? matches[0] : null;
  if (!q || q.status !== 'published' || typeof q.publishedAt !== 'string' || !Number.isFinite(Date.parse(q.publishedAt)) ||
      !Array.isArray(q.sourceIds) || !q.sourceIds.length || !Array.isArray(catalog.sources) ||
      q.sourceIds.some(id => {
        const sources = catalog.sources.filter(s => s?.sourceId === id);
        return sources.length !== 1 || !rightsStatuses.has(sources[0].rights?.status);
      })) return result;
  if (typeof q.stem !== 'string' || !Array.isArray(q.options) || q.options.length < 2 ||
      q.options.some(o => typeof o?.optionId !== 'string' || typeof o.text !== 'string') ||
      typeof receipt.explanation !== 'string' || receipt.answerOptionId !== q.answerOptionId ||
      !q.options.some(o => o.optionId === receipt.selectedOptionId) ||
      !q.options.some(o => o.optionId === receipt.answerOptionId)) throw new Error('attempt_evidence_invalid');
  return {
    ...result, availability:'available', reason:null,
    question:{questionId:q.questionId, questionVersionId:event.questionVersionId, version:q.version, stem:q.stem, options:q.options.map(o => ({optionId:o.optionId,text:o.text})), representation:'original'},
    receipt:{selectedOptionId:receipt.selectedOptionId, answerOptionId:receipt.answerOptionId, explanation:receipt.explanation, catalogVersion:receipt.catalogVersion ?? null,
      sources:(Array.isArray(receipt.sources) ? receipt.sources : [])
        .filter(s => s && q.sourceIds.includes(s.sourceId) && typeof s.sourceId === 'string' && typeof s.title === 'string' &&
          (s.url == null || typeof s.url === 'string') && (s.version == null || typeof s.version === 'string'))
        .map(s => ({sourceId:s.sourceId,title:s.title,url:s.url ?? null,version:s.version ?? null}))}
  };
}
