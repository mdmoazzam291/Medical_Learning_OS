import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(
  new URL('../supabase/functions/study-api/index.ts', import.meta.url),
  'utf8'
);

test('exam run API resolves learner identity from auth and keeps trusted RPCs server-side', () => {
  assert.match(source, /const learnerId = authData\.user\.id/);
  assert.match(source, /admin\.rpc\("exam_mock_readiness"/);
  assert.match(source, /admin\.rpc\("exam_assemble_mock"/);
  assert.match(source, /admin\.rpc\("exam_create_run"/);
  assert.match(source, /admin\.rpc\("exam_apply_transition"/);
});

test('exam start gates capacity before creating a run and restores seeded order', () => {
  const readiness = source.indexOf('admin.rpc("exam_mock_readiness"');
  const assembly = source.indexOf('admin.rpc("exam_assemble_mock"');
  const ordering = source.indexOf('seededQuestionOrder(');
  const create = source.indexOf('admin.rpc("exam_create_run"');
  assert.ok(readiness >= 0 && assembly > readiness && ordering > assembly && create > ordering);
  assert.match(source, /error: "exam_mock_not_ready"/);
  assert.match(source, /examBlueprintFidelity/);
  assert.match(source, /contentMixFidelity/);
});

test('exam run action API requires optimistic revision and request identity', () => {
  assert.match(source, /exactFields\(input, \["requestId", "expectedRevision", "questionVersionId", "optionId"\]\)/);
  assert.match(source, /exactFields\(input, \["requestId", "expectedRevision", "questionVersionId", "markedForReview"\]\)/);
  assert.match(source, /error: "exam_revision_conflict"/);
  assert.match(source, /p_expected_revision: expectedRevision/);
  assert.match(source, /p_request_key: requestId/);
});

test('exam answer mutation never accepts correctness or answer key from browser', () => {
  assert.doesNotMatch(source, /exactFields\(input, \[[^\]]*"correct"/);
  assert.doesNotMatch(source, /exactFields\(input, \[[^\]]*"answerOptionId"/);
  assert.match(source, /question\.options\.some/);
  assert.match(source, /buildExamCompletionReceipt/);
});

test('clock synchronization closes elapsed sections before learner actions', () => {
  const actionRoute = source.indexOf('const examRunActionMatch');
  const sync = source.indexOf('row = await syncExamClock(row, now);', actionRoute);
  const revision = source.indexOf('Number(row.state_revision) !== expectedRevision', actionRoute);
  assert.ok(actionRoute >= 0 && sync > actionRoute && revision > sync);
  assert.match(source, /eventType = completed \? "run\.completed" : "clock\.advanced"/);
});
