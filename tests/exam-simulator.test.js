import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  createLockedSectionExamRun,
  advanceExamRunClock,
  setExamAnswer,
  setExamReview,
  cancelExamRun,
  requestEarlySectionAdvance,
  examRunProgress,
  scoreCompletedExamRun
} from '../src/domain/exam-simulator.js';

const registry = JSON.parse(
  readFileSync(new URL('../data/exam-rules.json', import.meta.url), 'utf8')
);
const ruleSet = registry.ruleSets.find(rule => rule.ruleSetId === 'neet-pg:2026@1');
const ids = Array.from({ length: 180 }, (_, i) => `synthetic:q${String(i + 1).padStart(3, '0')}@1`);
const start = '2026-09-27T09:00:00.000Z';
const at = seconds => new Date(Date.parse(start) + seconds * 1000).toISOString();
const fresh = () => createLockedSectionExamRun({
  ruleSet,
  runId: 'synthetic-run-1',
  questionVersionIds: ids,
  startedAt: start
});

test('NEET-PG run pins exact verified ruleset and splits 180 questions into five locked sections', () => {
  const run = fresh();
  assert.equal(run.engineId, 'locked-time-sections-v1');
  assert.equal(run.ruleSetId, 'neet-pg:2026@1');
  assert.equal(run.sections.length, 5);
  assert.deepEqual(run.sections.map(s => s.questionVersionIds.length), [36, 36, 36, 36, 36]);
  assert.equal(run.sections[0].scheduledEndAt, at(42 * 60));
  assert.equal(run.scheduledEndAt, at(210 * 60));
  assert.equal(run.caveats.length > 0, true);
  assert.equal(Object.hasOwn(run, 'answerKey'), false);
});

test('current section answers can change and mark-for-review does not reveal correctness', () => {
  let run = fresh();
  run = setExamAnswer(run, { questionVersionId: ids[0], optionId: 'A', at: at(10) });
  run = setExamReview(run, { questionVersionId: ids[0], markedForReview: true, at: at(20) });
  run = setExamAnswer(run, { questionVersionId: ids[0], optionId: 'B', at: at(30) });
  assert.equal(run.responses[ids[0]].optionId, 'B');
  assert.equal(run.responses[ids[0]].markedForReview, true);
  assert.equal(run.responses[ids[0]].answeredAt, at(10));
  assert.equal(Object.hasOwn(run.responses[ids[0]], 'correct'), false);
});

test('future and closed sections reject writes and early manual advance is forbidden', () => {
  let run = fresh();
  assert.throws(
    () => setExamAnswer(run, { questionVersionId: ids[36], optionId: 'A', at: at(10) }),
    /future_section_locked/
  );
  assert.throws(() => requestEarlySectionAdvance(), /early_section_advance_forbidden/);
  run = advanceExamRunClock(run, at(42 * 60));
  assert.equal(run.currentSectionIndex, 1);
  assert.equal(run.sections[0].closedAt, at(42 * 60));
  assert.throws(
    () => setExamAnswer(run, { questionVersionId: ids[0], optionId: 'A', at: at(42 * 60 + 1) }),
    /section_locked/
  );
});

test('stale clients cannot submit after a section deadline because write first advances the server clock', () => {
  const run = fresh();
  assert.throws(
    () => setExamAnswer(run, { questionVersionId: ids[0], optionId: 'A', at: at(42 * 60 + 1) }),
    /section_locked/
  );
});

test('section timers do not carry forward and late resume closes every elapsed section deterministically', () => {
  let run = fresh();
  run = advanceExamRunClock(run, at(126 * 60));
  assert.equal(run.currentSectionIndex, 3);
  assert.deepEqual(run.sections.slice(0, 3).map(s => s.closedAt), [
    at(42 * 60), at(84 * 60), at(126 * 60)
  ]);
  assert.equal(run.sections[3].scheduledStartAt, at(126 * 60));
  assert.equal(run.sections[3].scheduledEndAt, at(168 * 60));
});

test('exam completes exactly at the pinned total duration', () => {
  let run = fresh();
  run = advanceExamRunClock(run, at(210 * 60));
  assert.equal(run.status, 'completed');
  assert.equal(run.currentSectionIndex, null);
  assert.equal(run.completedAt, at(210 * 60));
  assert.throws(
    () => setExamAnswer(run, { questionVersionId: ids[179], optionId: 'A', at: at(210 * 60 + 1) }),
    /exam_run_completed/
  );
});

test('explicit abandonment terminates the run without scoring and preserves prior answers', () => {
  let run = fresh();
  run = setExamAnswer(run, { questionVersionId: ids[0], optionId: 'A', at: at(10) });
  run = cancelExamRun(run, { at: at(20), reason: 'user_abandoned' });
  assert.equal(run.status, 'cancelled');
  assert.equal(run.currentSectionIndex, null);
  assert.equal(run.completedAt, null);
  assert.deepEqual(run.termination, {
    kind: 'cancelled',
    reason: 'user_abandoned',
    at: at(20)
  });
  assert.equal(run.sections[0].closedAt, at(20));
  assert.equal(run.responses[ids[0]].optionId, 'A');
  assert.throws(
    () => setExamAnswer(run, { questionVersionId: ids[1], optionId: 'B', at: at(21) }),
    /exam_run_completed/
  );
  const key = Object.fromEntries(ids.map(id => [id, 'A']));
  assert.throws(() => scoreCompletedExamRun({ run, ruleSet, answerKey: key }), /not_completed/);
});

test('cancellation cannot replace natural completion and validates terminal reason', () => {
  const run = fresh();
  assert.throws(
    () => cancelExamRun(run, { at: at(10), reason: 'unknown' }),
    /cancellation reason/
  );
  const completed = advanceExamRunClock(run, at(210 * 60));
  assert.throws(
    () => cancelExamRun(completed, { at: at(210 * 60), reason: 'operator_cancelled' }),
    /exam_run_completed/
  );
});

test('progress is descriptive and current-section aware', () => {
  let run = fresh();
  run = setExamAnswer(run, { questionVersionId: ids[0], optionId: 'A', at: at(5) });
  run = setExamReview(run, { questionVersionId: ids[1], markedForReview: true, at: at(6) });
  const progress = examRunProgress(run, at(7));
  assert.equal(progress.currentSectionId, 'A');
  assert.equal(progress.totalQuestions, 180);
  assert.equal(progress.answered, 1);
  assert.equal(progress.unanswered, 179);
  assert.equal(progress.markedForReview, 1);
});

test('trusted scoring occurs only after completion and uses the pinned marking scheme', () => {
  let run = fresh();
  run = setExamAnswer(run, { questionVersionId: ids[0], optionId: 'A', at: at(5) });
  run = setExamReview(run, { questionVersionId: ids[0], markedForReview: true, at: at(6) });
  run = setExamAnswer(run, { questionVersionId: ids[1], optionId: 'B', at: at(7) });

  const key = Object.fromEntries(ids.map(id => [id, 'A']));
  assert.throws(() => scoreCompletedExamRun({ run, ruleSet, answerKey: key }), /not_completed/);

  run = advanceExamRunClock(run, at(210 * 60));
  const score = scoreCompletedExamRun({ run, ruleSet, answerKey: key });
  assert.equal(score.correct, 1);
  assert.equal(score.incorrect, 1);
  assert.equal(score.unanswered, 178);
  assert.equal(score.markedForReview, 1);
  assert.equal(score.score, 3);
});

test('run creation rejects wrong question counts and duplicate immutable versions', () => {
  assert.throws(
    () => createLockedSectionExamRun({
      ruleSet, runId: 'bad', questionVersionIds: ids.slice(0, 179), startedAt: start
    }),
    /Question count/
  );
  const duplicates = [...ids];
  duplicates[179] = duplicates[0];
  assert.throws(
    () => createLockedSectionExamRun({
      ruleSet, runId: 'bad', questionVersionIds: duplicates, startedAt: start
    }),
    /Duplicate/
  );
});

test('run and score snapshots are deeply immutable', () => {
  const run = fresh();
  assert.throws(() => { run.sections[0].questionVersionIds[0] = 'changed'; }, TypeError);
  assert.throws(() => { run.caveats[0] = 'changed'; }, TypeError);
});
