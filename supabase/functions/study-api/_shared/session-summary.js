// Read-only projection of one owned session. No mastery or scheduling authority.
export function buildSessionSummary({ session, attempts, revisions, concepts = [], generatedAt }) {
  const ids = session.question_version_ids;
  if (!Array.isArray(ids) || ids.length > 50 || new Set(ids).size !== ids.length) throw new Error('invalid_session_summary');
  const seen = new Set();
  const groups = new Map();
  let correctCount = 0;
  const representations = { original: 0, 'concise-practice': 0 };
  const labels = new Map(concepts.map(c => [c.conceptId, c.label]));
  for (const row of attempts) {
    const e = row.event;
    if (!Number.isInteger(row.position) || ids[row.position] !== e?.questionVersionId ||
        e?.type !== 'question.answered' || typeof e.correct !== 'boolean' || !e.conceptId || seen.has(row.position)) {
      throw new Error('invalid_session_summary');
    }
    seen.add(row.position);
    const representation = row.presentation?.representation || 'original';
    if (!Object.hasOwn(representations, representation)) throw new Error('invalid_session_summary');
    representations[representation]++;
    if (e.correct) correctCount++;
    const group = groups.get(e.conceptId) || { conceptId: e.conceptId, label: labels.get(e.conceptId) || 'Connected concept', answeredCount: 0, incorrectCount: 0 };
    group.answeredCount++;
    if (!e.correct) group.incorrectCount++;
    groups.set(e.conceptId, group);
  }
  const answeredIds = new Set(attempts.filter(row => !row.presentation || row.presentation.representation === 'original').map(row => row.event.questionVersionId));
  const schedule = revisions === null ? null : revisions.filter(row => answeredIds.has(row.question_version_id));
  const dates = (schedule || []).map(row => row.due_at).filter(at => typeof at === 'string' && Number.isFinite(Date.parse(at))).sort((a, b) => Date.parse(a) - Date.parse(b));
  return {
    contractId: 'study-session-summary-v1', sessionId: session.id, closed: session.closed,
    generatedAt, selectedCount: ids.length, answeredCount: seen.size,
    unansweredCount: ids.length - seen.size, correctCount, incorrectCount: seen.size - correctCount,
    accuracy: seen.size ? correctCount / seen.size : null,
    completedAllSelected: session.closed && seen.size === ids.length,
    concepts: [...groups.values()], representations,
    revision: {
      available: revisions !== null, scope: 'current-schedule-for-original-session-items',
      scheduledCount: dates.length, missingCount: revisions === null ? null : answeredIds.size - dates.length,
      dueNowCount: revisions === null ? null : dates.filter(at => Date.parse(at) <= Date.parse(generatedAt)).length,
      nextDueAt: dates[0] || null
    },
    masteryInferenceAuthority: false, schedulerAuthority: false
  };
}
