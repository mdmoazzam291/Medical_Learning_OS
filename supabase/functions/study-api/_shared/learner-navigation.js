// Bounded read projections. Never return exam state, keys, explanations or response maps.
export async function readLearnerNavigation({ admin, learnerId, path, search = '', internalExamTester = false, trustedRead = (_operation, read) => read() }) {
  const params = new URLSearchParams(search);
  if ([...params.keys()].some(k => k !== 'offset') || params.getAll('offset').length > 1) throw new Error('query_not_supported');
  const raw = params.get('offset') || '0';
  if (!/^\d{1,6}$/.test(raw) || Number(raw) > 100000) throw new Error('offset_invalid');
  const offset = Number(raw);
  if (typeof learnerId !== 'string' || !learnerId) throw new Error('learner_required');
  const history = path === '/exam-simulator/history';
  if (!history && path !== '/activity') throw new Error('navigation_route_unknown');
  const result = await trustedRead(history ? 'exam_history' : 'recent_activity', () => admin.from(history ? 'exam_runs' : 'study_attempts')
    .select(history ? 'id,learner_id,exam_id,rule_set_id,status,state,started_at,completed_at' : 'id,learner_id,event,recorded_at,presentation')
    .eq('learner_id', learnerId)
    .order(history ? 'started_at' : 'recorded_at', { ascending: false })
    .order('id', { ascending: false }).range(offset, offset + 49));
  if (result.error || !Array.isArray(result.data)) throw new Error('navigation_read_failed');
  const rows = result.data.filter(row => row.learner_id === learnerId);
  const paging = { nextOffset: result.data.length === 50 ? offset + 50 : null };
  if (history) return { contractId: 'learner-exam-history-v1', ...paging, runs: rows.filter(row => row.state?.assembly?.testingOnly !== true || internalExamTester === true).map(row => ({ runId: row.id, examId: row.exam_id, ruleSetId: row.rule_set_id, status: row.status, startedAt: row.started_at, completedAt: row.completed_at, testingOnly: row.state?.assembly?.testingOnly === true })) };
  return { contractId: 'learner-activity-v1', ...paging, items: rows.map(row => ({ attemptId: row.id, recordedAt: row.recorded_at, questionVersionId: row.event?.questionVersionId, conceptId: row.event?.conceptId, correct: typeof row.event?.correct === 'boolean' ? row.event.correct : null, representation: ['original', 'concise-practice'].includes(row.presentation?.representation) ? row.presentation.representation : row.presentation ? 'unclassified' : 'original' })) };
}
