import test from 'node:test';
import assert from 'node:assert/strict';
const mod = await import('../supabase/functions/study-api/_shared/learner-navigation.js').catch(() => null);
const read = input => { assert.ok(mod, 'learner-owned navigation reads are implemented'); return mod.readLearnerNavigation(input); };
function database(rows) {
  const calls = [];
  const query = { select(v) { calls.push(['select', v]); return this; }, eq(k, v) { calls.push(['eq', k, v]); return this; }, order(k, v) { calls.push(['order', k, v]); return this; }, range(a, b) { calls.push(['range', a, b]); return Promise.resolve({ data: rows, error: null }); } };
  return { calls, from(table) { calls.push(['from', table]); return query; } };
}
test('history scopes reads to authenticated owner and excludes internal runs without permission', async () => {
  const admin = database([{ id: 'owned', learner_id: 'u1', status: 'completed', state: { assembly: { testingOnly: false }, responses: { hidden: 'answer' } }, started_at: '2026-10-01T00:00:00Z' }, { id: 'internal', learner_id: 'u1', status: 'completed', state: { assembly: { testingOnly: true } } }]);
  const data = await read({ admin, learnerId: 'u1', path: '/exam-simulator/history', search: '' });
  assert.ok(admin.calls.some(x => x[0] === 'eq' && x[1] === 'learner_id' && x[2] === 'u1'));
  assert.deepEqual(data.runs.map(x => x.runId), ['owned']);
  assert.equal(data.runs[0].state, undefined); assert.doesNotMatch(JSON.stringify(data), /hidden|responses/);
});
test('history pagination is bounded and rejects caller-supplied learner identity', async () => {
  const admin = database([]);
  await read({ admin, learnerId: 'u1', path: '/exam-simulator/history', search: '?offset=50' });
  assert.ok(admin.calls.some(x => x[0] === 'range' && x[1] === 50 && x[2] === 99));
  await assert.rejects(read({ admin, learnerId: 'u1', path: '/exam-simulator/history', search: '?learnerId=u2' }), /query_not_supported/);
});
test('recent activity exposes observed original/concise labels without keys, guesses or other learners', async () => {
  const admin = database([{ learner_id: 'u1', id: 'a1', recorded_at: '2026-10-01T00:00:00Z', event: { questionVersionId: 'q1@1', conceptId: 'c1', correct: false, answerOptionId: 'hidden', explanation: 'secret' }, presentation: { representation: 'concise-practice' } }]);
  const data = await read({ admin, learnerId: 'u1', path: '/activity', search: '' });
  assert.equal(data.items[0].representation, 'concise-practice'); assert.equal(data.items[0].correct, false);
  assert.equal(data.items[0].answerOptionId, undefined); assert.equal(data.items[0].explanation, undefined);
  assert.ok(admin.calls.some(x => x[0] === 'eq' && x[2] === 'u1'));
});
