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
  const ordering = source.indexOf('seededQuestionOrder(', assembly);
  const create = source.indexOf('admin.rpc("exam_create_run"', ordering);
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


test('identical mutation retries are resolved from the immutable ledger before revision rejection', () => {
  const actionRoute = source.indexOf('const examRunActionMatch');
  const priorEvent = source.indexOf('getExamRunEvent(runId, requestId)', actionRoute);
  const revisionCheck = source.indexOf('Number(row.state_revision) !== expectedRevision', actionRoute);
  assert.ok(actionRoute >= 0 && priorEvent > actionRoute && revisionCheck > priorEvent);
  assert.match(source, /idempotent: true/);
  assert.match(source, /exam_request_key_collision/);
});


test('exam run routes reject unsupported query text instead of silently widening the contract', () => {
  const matches = source.match(/if \(url\.search\) fail\(400, "query_not_supported"\);/g) ?? [];
  assert.ok(matches.length >= 4);
});


test('internal test run start is a separate app-metadata-gated route', () => {
  assert.match(source, /path === "\/exam-simulator\/test-runs"/);
  assert.match(source, /authData\.user\.app_metadata\?\.medical_learning_os_internal_tester === true/);
  assert.match(source, /if \(!internalExamTester\) fail\(403, "internal_exam_test_forbidden"\)/);
  assert.doesNotMatch(source, /user_metadata\?\.medical_learning_os_internal_tester/);
  assert.match(source, /admin\.rpc\("exam_mock_test_readiness"/);
  assert.match(source, /admin\.rpc\("exam_assemble_test_mock"/);
  assert.match(source, /testingOnly: true/);
  assert.match(source, /productionEquivalent: false/);
});

test('production run start remains published-only and does not use test readiness', () => {
  const productionStart = source.indexOf('path === "/exam-simulator/runs"');
  const productionEnd = source.indexOf('path === "/exam-simulator/runs/current"', productionStart);
  const block = source.slice(productionStart, productionEnd);
  assert.match(block, /admin\.rpc\("exam_mock_readiness"/);
  assert.match(block, /admin\.rpc\("exam_assemble_mock"/);
  assert.doesNotMatch(block, /exam_mock_test_readiness/);
  assert.doesNotMatch(block, /exam_assemble_test_mock/);
  assert.match(block, /exam_internal_test_run_already_open/);
});

test('test-run authorization is rechecked on read and mutation after grant revocation', () => {
  assert.match(source, /const requireExamRunAccess = \(row: any\) =>/);
  assert.match(source, /row\?\.state\?\.assembly\?\.testingOnly === true && !internalExamTester/);
  const currentRead = source.indexOf('path === "/exam-simulator/runs/current"');
  assert.ok(source.indexOf('requireExamRunAccess(row);', currentRead) > currentRead);
  const specificRead = source.indexOf('const examRunReadMatch');
  assert.ok(source.indexOf('requireExamRunAccess(row);', specificRead) > specificRead);
  const actions = source.indexOf('const examRunActionMatch');
  assert.ok(source.indexOf('requireExamRunAccess(row);', actions) > actions);
});

test('simulator question view attaches learner-safe signed media projection', () => {
  const view = source.indexOf('const examRunView = async');
  const end = source.indexOf('const sessionState = async', view);
  const block = source.slice(view, end);
  assert.match(block, /await Promise\.all\(currentSection\.questionVersionIds\.map/);
  assert.match(block, /media: await learnerMediaPrompt\(String\(questionVersionId\)\)/);
  assert.doesNotMatch(block, /diagnosisEvidence/);
  assert.doesNotMatch(block, /annotationVersionIds/);
});


test('exam cancellation is revisioned, idempotent and receipt-free', () => {
  const route = source.indexOf('const examRunCancelMatch');
  assert.ok(route >= 0);
  const tail = source.slice(route);
  assert.match(tail, /exactFields\(input, \["requestId", "expectedRevision"\]\)/);
  assert.match(tail, /const reason = "user_abandoned"/);
  assert.doesNotMatch(tail, /identifier\(input\.reason\)/);
  assert.match(tail, /priorEvent\.event_type === "run\.cancelled"/);
  assert.match(tail, /p_event_type: "run\.cancelled"/);
  assert.match(tail, /p_completion_receipt: null/);
  assert.match(tail, /requireExamRunAccess\(row\)/);
  assert.match(source, /termination: state\.termination \?\? null/);
});

test('cancellation checks terminal state before writing and cannot score a cancelled run', () => {
  const route = source.indexOf('const examRunCancelMatch');
  const readiness = source.indexOf('path === "/exam-simulator/readiness"', route);
  const block = source.slice(route, readiness);
  assert.match(block, /row = await syncExamClock\(row, now\)/);
  assert.match(block, /row\.status === "completed"/);
  assert.match(block, /row\.status === "cancelled"/);
  assert.doesNotMatch(block, /buildExamCompletionReceipt/);
});


test('GT Autopsy route is completed-run-only, learner scoped and rechecks internal-test access', () => {
  const route = source.indexOf('const examRunAutopsyMatch');
  const action = source.indexOf('const examRunActionMatch', route);
  assert.ok(route >= 0 && action > route);
  const block = source.slice(route, action);
  assert.match(block, /getExamRun\(runId\)/);
  assert.match(block, /requireExamRunAccess\(row\)/);
  assert.match(block, /row = await syncExamClock\(row, now\)/);
  assert.match(block, /gt_autopsy_requires_completed_run/);
  assert.match(block, /getExamReceipt\(runId\)/);
  assert.match(block, /getExamRunEvents\(runId\)/);
  assert.match(block, /getExamMediaMetadata\(ids\)/);
  assert.match(block, /buildGtAutopsyV1/);
});

test('GT Autopsy does not expose answer keys or enable unsupported inference', () => {
  assert.match(source, /import \{ buildGtAutopsyV1 \} from "\.\/_shared\/gt-autopsy\.js"/);
  const route = source.indexOf('const examRunAutopsyMatch');
  const action = source.indexOf('const examRunActionMatch', route);
  const block = source.slice(route, action);
  assert.doesNotMatch(block, /answerOptionId/);
  assert.doesNotMatch(block, /mastery/);
  assert.doesNotMatch(block, /preventable/);
  assert.doesNotMatch(block, /fatigue/);
  assert.doesNotMatch(block, /confidence/);
});


test('internal test readiness is separately gated and never widens production readiness', () => {
  const testReadiness = source.indexOf('path === "/exam-simulator/test-readiness"');
  const testStart = source.indexOf('path === "/exam-simulator/test-runs"', testReadiness);
  assert.ok(testReadiness >= 0 && testStart > testReadiness);
  const block = source.slice(testReadiness, testStart);
  assert.match(block, /if \(!internalExamTester\) fail\(403, "internal_exam_test_forbidden"\)/);
  assert.match(block, /admin\.rpc\("exam_mock_test_readiness"/);
  assert.doesNotMatch(block, /exam_mock_readiness"/);
});

test('exam run view carries trusted serverNow for countdown synchronization', () => {
  const view = source.indexOf('const examRunView = async');
  const end = source.indexOf('const sessionState = async', view);
  const block = source.slice(view, end);
  assert.match(block, /serverNow: at/);
});


test('query-bearing exam routes are not blocked by a global search guard', () => {
  const testReadiness = source.indexOf('path === "/exam-simulator/test-readiness"');
  const productionReadiness = source.indexOf('path === "/exam-simulator/readiness"');
  const examDna = source.indexOf('path === "/exam-dna"');
  assert.ok(testReadiness > 0 && productionReadiness > testReadiness && examDna > productionReadiness);

  const previousRouteEnd = source.lastIndexOf("\n    }", testReadiness);
  const beforeTestReadiness = source.slice(previousRouteEnd + 6, testReadiness);
  assert.doesNotMatch(beforeTestReadiness, /if \(url\.search\) fail\(400, "query_not_supported"\);\s*$/m);

  const progress = source.indexOf('path === "/progress"');
  const progressBlock = source.slice(progress, testReadiness);
  assert.match(progressBlock, /if \(url\.search\) fail\(400, "query_not_supported"\)/);

  const mistakes = source.indexOf('path === "/diagnostics/mistakes"');
  const mistakesBlock = source.slice(mistakes, mistakes + 400);
  assert.match(mistakesBlock, /if \(url\.search\) fail\(400, "query_not_supported"\)/);
});

test('readiness and exam DNA retain route-specific allowed query parameters', () => {
  const testReadiness = source.slice(
    source.indexOf('path === "/exam-simulator/test-readiness"'),
    source.indexOf('path === "/exam-simulator/test-runs"')
  );
  assert.match(testReadiness, /searchParams\.get\("ruleSetId"\)/);

  const productionReadiness = source.slice(
    source.indexOf('path === "/exam-simulator/readiness"'),
    source.indexOf('path === "/exam-dna"')
  );
  assert.match(productionReadiness, /searchParams\.get\("ruleSetId"\)/);

  const examDna = source.slice(
    source.indexOf('path === "/exam-dna"'),
    source.indexOf('path === "/diagnostics/mistakes"')
  );
  assert.match(examDna, /searchParams\.get\("examId"\)/);
});

