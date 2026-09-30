import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createContext, runInContext } from 'node:vm';

const source = (await readFile(new URL('../web/medical.js', import.meta.url), 'utf8'))
  .replace(/^import .*;\n/gm, '')
  .replace(/\nrender\(\);\nbootstrap\(\);\s*$/, '');
const receipt = {
  selectedOptionId: 'a', answerOptionId: 'a', explanation: 'Synthetic explanation',
  sources: [], event: { eventId: 'attempt:test', correct: true }
};
const session = {
  sessionId: 'session:test', position: 0, total: 1, closed: false,
  question: { stem: 'Synthetic test question', questionVersionId: 'synthetic@1', options: [{ optionId: 'a', text: 'Synthetic option' }] }
};

function harness(cloud) {
  const root = { innerHTML: '', addEventListener() {} };
  const notice = { textContent: '', hidden: true };
  const monitored = [];
  const context = createContext({
    document: { querySelector: selector => selector === '#medical-app' ? root : notice },
    createSupabaseAuth: () => ({ currentUser: () => ({ email: 'synthetic@example.invalid' }) }),
    createCloudStudy: () => ({ sessionSummary: async id => ({ contractId: 'study-session-summary-v1', sessionId: id, closed: true, selectedCount: 1, answeredCount: 1, correctCount: 1, incorrectCount: 0, completedAllSelected: true, concepts: [], revision: { available: false } }), ...cloud }),
    cloudConfig: {}, localStorage: {}, URL, URLSearchParams,
    location: { search: '', href: 'https://example.invalid/web/medical.html' }, history: { replaceState() {} },
    errorMonitor: { capture: (error, metadata) => monitored.push({ error, metadata }) }
  });
  runInContext(source, context);
  context.testSession = structuredClone(session);
  context.testReceipt = structuredClone(receipt);
  runInContext("state.session = testSession; state.selectedOptionId = 'a'; state.progress = { attempts: 2 };", context);
  return { context, root, notice, monitored, state: () => runInContext('state', context) };
}
const projectionFailure = () => { throw Object.assign(new Error('projection unavailable'), { status: 503 }); };

test('accepted answer survives progress failure and still accepts an optional memory rating', async () => {
  let writes = 0;
  let ratings = 0;
  const h = harness({
    answer: async () => { writes++; return receipt; },
    progress: projectionFailure,
    memoryJudgment: async (attemptId, rating) => {
      assert.equal(attemptId, receipt.event.eventId);
      assert.equal(rating, 3);
      ratings++;
      return { ratingLabel: 'Good' };
    }
  });
  await runInContext('answerCurrent()', h.context);
  assert.equal(writes, 1);
  assert.equal(h.state().receipt.event.eventId, receipt.event.eventId);
  assert.equal(h.state().error, null);
  assert.equal(h.state().busy, false);
  assert.equal(h.state().progress.attempts, 2);
  assert.match(h.root.innerHTML, /Finish session/);
  assert.match(h.notice.textContent, /Answer saved/);
  assert.doesNotMatch(h.notice.textContent, /not confirmed|retry/i);
  assert.equal(h.monitored[0].metadata.operation, 'refresh_progress_after_write');
  await runInContext('recordMemoryRating(3)', h.context);
  assert.equal(ratings, 1);
  assert.equal(h.state().memoryJudgment.ratingLabel, 'Good');
});

test('confirmed completion still reads integrity when progress projection fails', async () => {
  let integrityReads = 0;
  const h = harness({
    next: async () => ({ ...session, closed: true, question: null }),
    progress: projectionFailure,
    studyNowIntegrity: async () => {
      integrityReads++;
      return { latestRecommendation: { sessionId: session.sessionId, evidenceChainComplete: true, hostedM05cGateSatisfied: true } };
    }
  });
  runInContext('state.receipt = testReceipt;', h.context);
  await runInContext('nextQuestion()', h.context);
  assert.equal(h.state().session.closed, true);
  assert.equal(h.state().error, null);
  assert.equal(integrityReads, 1);
  assert.match(h.root.innerHTML, /Study Now loop verified/);
  assert.match(h.notice.textContent, /Session complete/);
  assert.doesNotMatch(h.notice.textContent, /did not advance|retry/i);
});

test('unavailable completion projections cannot undo server-confirmed closure or invent integrity', async () => {
  const h = harness({
    next: async () => ({ ...session, closed: true, question: null }),
    progress: projectionFailure,
    sessionSummary: projectionFailure,
    studyNowIntegrity: projectionFailure
  });
  runInContext('state.receipt = testReceipt;', h.context);
  await runInContext('nextQuestion()', h.context);
  assert.equal(h.state().session.closed, true);
  assert.equal(h.state().error, null);
  assert.equal(h.state().studyNowIntegrity, null);
  assert.match(h.root.innerHTML, /MEDICAL SESSION CLOSED/);
  assert.doesNotMatch(h.root.innerHTML, /MEDICAL SESSION COMPLETE/);
  assert.doesNotMatch(h.root.innerHTML, /Study Now loop verified/);
  assert.equal(h.monitored.length, 3);
});

test('actual answer-write failure preserves selection and retains the idempotent retry message', async () => {
  let progressReads = 0;
  const h = harness({
    answer: async () => { throw Object.assign(new Error('write unavailable'), { code: 'answer_write_failed', status: 503 }); },
    progress: async () => { progressReads++; }
  });
  await runInContext('answerCurrent()', h.context);
  assert.equal(h.state().receipt, null);
  assert.equal(h.state().selectedOptionId, 'a');
  assert.equal(h.state().busy, false);
  assert.equal(progressReads, 0);
  assert.match(h.notice.textContent, /Answer was not confirmed.*same idempotency key/);
});

test('actual advance failure preserves answered slot for a safe retry', async () => {
  const h = harness({ next: async () => { throw Object.assign(new Error('advance unavailable'), { status: 503 }); } });
  runInContext('state.receipt = testReceipt;', h.context);
  await runInContext('nextQuestion()', h.context);
  assert.equal(h.state().session.closed, false);
  assert.equal(h.state().receipt.event.eventId, receipt.event.eventId);
  assert.equal(h.state().busy, false);
  assert.match(h.notice.textContent, /Session did not advance.*Retry is safe/);
});

test('confirmed advance clears the answered-earlier notice before showing an unanswered item', async () => {
  const h = harness({ next: async () => ({ ...session, position: 1, total: 2, receipt: null }) });
  runInContext('state.receipt = testReceipt;', h.context);
  h.notice.textContent = 'This question was already answered earlier.';
  h.notice.hidden = false;
  await runInContext('nextQuestion()', h.context);
  assert.equal(h.state().session.position, 1);
  assert.equal(h.state().receipt, null);
  assert.match(h.root.innerHTML, /Question 2 of 2/);
  assert.equal(h.notice.textContent, '');
  assert.equal(h.notice.hidden, true);
});

test('failed summary restore does not claim a session finished or expose question content', async () => {
  const h = harness({ sessionSummary: async () => { throw Object.assign(new Error('not found'), { status: 404 }); } });
  await runInContext("loadSessionSummary('other-session', true)", h.context);
  assert.equal(h.state().session.closed, undefined);
  assert.match(h.root.innerHTML, /Completion has not been confirmed here/);
  assert.doesNotMatch(h.root.innerHTML, /MEDICAL SESSION COMPLETE|Synthetic test question/);
});

test('summary outage cannot undo acknowledged closure and offers a read-only retry', async () => {
  const h = harness({
    next: async () => ({ ...session, closed: true, question: null }),
    sessionSummary: async () => { throw Object.assign(new Error('summary unavailable'), { status: 503 }); },
    progress: async () => ({ attempts: 3 }), studyNowIntegrity: async () => null
  });
  runInContext('state.receipt = testReceipt;', h.context);
  await runInContext('nextQuestion()', h.context);
  assert.equal(h.state().session.closed, true);
  assert.equal(h.state().error, null);
  assert.match(h.root.innerHTML, /Retry session results/);
  assert.doesNotMatch(h.notice.textContent, /did not advance/);
});

test('Vault return restores the server cursor and receipt without answer/advance writes', async () => {
  let reads = 0;
  const saved = { ...session, position: 2, total: 4, receipt, memoryJudgment: { ratingLabel: 'Good' } };
  const h = harness({ session: async id => { reads++; assert.equal(id, session.sessionId); return saved; }, answer: () => assert.fail('return must not answer'), next: () => assert.fail('return must not advance') });
  await runInContext('loadResumedSession(testSession.sessionId)', h.context);
  assert.equal(reads, 1);
  assert.equal(h.state().session.position, 2);
  assert.equal(h.state().receipt.event.eventId, receipt.event.eventId);
  assert.equal(h.state().memoryJudgment.ratingLabel, 'Good');
  assert.match(h.root.innerHTML, /Question 3 of 4/);
});

test('unowned or failed resume cannot display stale evidence or manufacture closure', async () => {
  const h = harness({ session: async () => { throw Object.assign(new Error('not found'), { status: 404 }); } });
  runInContext('state.receipt = testReceipt;', h.context);
  await runInContext('loadResumedSession(testSession.sessionId)', h.context);
  assert.equal(h.state().session.resumeUnavailable, true);
  assert.equal(h.state().session.closed, undefined);
  assert.equal(h.state().receipt, null);
  assert.match(h.root.innerHTML, /Retry saved session/);
  assert.doesNotMatch(h.root.innerHTML, /Synthetic test question|MEDICAL SESSION COMPLETE/);
});

test('returning after another device closes the session shows summary, even during a summary outage', async () => {
  const h = harness({ session: async () => ({ ...session, closed: true, question: null }), sessionSummary: projectionFailure });
  await runInContext('loadResumedSession(testSession.sessionId)', h.context);
  assert.equal(h.state().session.closed, true);
  assert.match(h.root.innerHTML, /Retry session results/);
  assert.doesNotMatch(h.root.innerHTML, /Synthetic test question|Check answer/);
});
