import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildSessionSummary } from '../supabase/functions/study-api/_shared/session-summary.js';
const base = {
  session: { id: 'session:test', closed: true, question_version_ids: ['one@1','two@1'] },
  attempts: [{ position: 0, event: { type: 'question.answered', questionVersionId: 'one@1', conceptId: 'concept:one', correct: false } }, { position: 1, event: { type: 'question.answered', questionVersionId: 'two@1', conceptId: 'concept:one', correct: true } }],
  revisions: [{ question_version_id: 'one@1', due_at: '2026-09-30T12:00:00Z' }, { question_version_id: 'other@1', due_at: '2026-09-29T00:00:00Z' }],
  concepts: [{ conceptId: 'concept:one', label: 'Synthetic concept' }],
  generatedAt: '2026-09-30T03:00:00Z'
};
test('session summary counts only exact-session attempts and links canonical concepts', () => {
  const s = buildSessionSummary(base);
  assert.equal(s.answeredCount, 2);
  assert.equal(s.correctCount, 1);
  assert.equal(s.incorrectCount, 1);
  assert.equal(s.completedAllSelected, true);
  assert.equal(s.accuracy, 0.5);
  assert.equal(s.concepts.length, 1);
  assert.equal(s.concepts[0].incorrectCount, 1);
  assert.equal(s.concepts[0].label, 'Synthetic concept');
  assert.equal(s.revision.nextDueAt, '2026-09-30T12:00:00Z');
  assert.equal(s.revision.missingCount, 1);
  assert.equal(s.masteryInferenceAuthority, false);
  assert.equal(s.schedulerAuthority, false);
  assert.equal(JSON.stringify(s).includes('answerOptionId'), false);
});
test('schedule outages remain unknown rather than zero, while partial closure stays partial', () => {
  const s = buildSessionSummary({ ...base, revisions: null, attempts: base.attempts.slice(0,1) });
  assert.equal(s.revision.available, false);
  assert.equal(s.revision.missingCount, null);
  assert.equal(s.revision.dueNowCount, null);
  assert.equal(s.completedAllSelected, false);
  assert.equal(s.unansweredCount, 1);
});
test('zero attempts produce null accuracy; due-now follows the current server clock', () => {
  assert.equal(buildSessionSummary({ ...base, attempts: [] }).accuracy, null);
  const s = buildSessionSummary({ ...base, generatedAt: '2026-10-01T03:00:00Z' });
  assert.equal(s.revision.dueNowCount, 1);
});
test('mismatched or duplicate attempt positions cannot manufacture session performance', () => {
  assert.throws(() => buildSessionSummary({ ...base, attempts: [base.attempts[0],base.attempts[0]] }), /invalid_session_summary/);
  assert.throws(() => buildSessionSummary({ ...base, attempts: [{ ...base.attempts[0], position: 1 }] }), /invalid_session_summary/);
});
test('summary API is bounded and derives identity exclusively from authenticated learner', async () => {
  const source = await readFile(new URL('../supabase/functions/study-api/index.ts', import.meta.url), 'utf8');
  const route = source.slice(source.indexOf('const summaryMatch'), source.indexOf('const sessionMatch'));
  assert.match(route, /req.method === "GET"/);
  assert.equal((route.match(/eq\("learner_id", learnerId\)/g) || []).length, 3);
  assert.match(route, /if \(!session\) fail\(404, "session_not_found"\)/);
  assert.match(route, /limit\(50\)/);
  assert.doesNotMatch(route, /insert\(|update\(|rpc\(/);
});
