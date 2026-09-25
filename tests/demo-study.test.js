import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, transition, currentAttempt, currentQuestion, queue, validateState } from '../src/domain/demo-study.js';
const start = () => transition(initialState('learner'), { type: 'start', id: 'session-1', now: 1000 });
const action = (s, type, extra = {}) => transition(s, { type, sessionId: s.session.id, index: s.session.index, now: 2000, ...extra });
const answer = (s, option) => action(action(s, 'select', { option }), 'answer');
test('answer requires selection, locks scoring, and duplicate submission is idempotent', () => {
  const s = start();
  assert.throws(() => action(s, 'answer'), /Select/);
  assert.throws(() => action(s, 'next'), /Submit/);
  const answered = answer(s, 1);
  assert.equal(answered.events.length, 1);
  assert.equal(currentAttempt(answered).correct, false);
  assert.deepEqual(action(answered, 'answer'), answered);
  assert.throws(() => action(answered, 'select', { option: 0 }), /locked/);
  assert.equal(s.events.length, 0);
});
test('session resumes selection and explanation across serialization', () => {
  const selected = JSON.parse(JSON.stringify(action(start(), 'select', { option: 0 })));
  assert.equal(validateState(selected).session.selected, 0);
  const submitted = JSON.parse(JSON.stringify(action(selected, 'answer')));
  assert.equal(currentAttempt(submitted).correct, true);
  const resumed = transition(submitted, { type: 'start', id: 'new', now: 9000 });
  assert.equal(resumed.session.id, 'session-1');
});
test('stale tab actions cannot answer a different question or skip ahead', () => {
  const s = action(answer(start(), 0), 'next');
  assert.throws(() => transition(s, { type: 'answer', sessionId: 'session-1', index: 0, now: 3000 }), /another tab/);
});
test('incorrect queue uses latest evidence and bookmark queue is separate', () => {
  let s = answer(start(), 1);
  assert.equal(queue(s, 'incorrect').length, 1);
  s = transition(s, { type: 'bookmark', id: currentQuestion(s).id });
  assert.equal(queue(s, 'bookmarks').length, 1);
  for (let i = 0; i < 2; i++) { s = action(s, 'next'); s = answer(s, 1); }
  s = action(s, 'next');
  assert.equal(currentQuestion(s), undefined);
  s = transition(s, { type: 'start', id: 'session-2', filter: 'incorrect', now: 5000 });
  assert.equal(s.session.questionIds.length, 1);
  s = answer(s, 0);
  assert.equal(queue(s, 'incorrect').length, 0);
  assert.equal(queue(s, 'bookmarks').length, 1);
});
test('pause and resume exclude known interruption time', () => {
  let s = action(start(), 'pause', { now: 1500 });
  s = transition(s, { type: 'resume', now: 10000 });
  s = action(s, 'select', { option: 0 });
  s = action(s, 'answer', { now: 11000 });
  assert.equal(currentAttempt(s).durationMs, 1500);
});
test('corrupt data, future schemas, invalid dates and foreign evidence fail without reset', () => {
  for (const mutate of [s => s.schemaVersion = 2, s => s.settings.targetDate = '2027-02-30', s => s.settings.dailyGoal = 0,
    s => s.bookmarks.push('medical:unreviewed'), s => { s.session.index = 1; s.events = []; }, s => s.events[0].learnerId = 'another']) {
    const s = structuredClone(answer(start(), 0));
    mutate(s); assert.throws(() => validateState(s));
  }
});
