import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('medical learner page uses authenticated cloud study and server scoring', async () => {
  const source = await readFile(new URL('../web/medical.js', import.meta.url), 'utf8');

  assert.match(source, /createSupabaseAuth/);
  assert.match(source, /createCloudStudy/);
  assert.match(source, /cloud\.questions\('all'\)/);
  assert.match(source, /cloud\.start/);
  assert.match(source, /cloud\.answer/);
  assert.match(source, /cloud\.next/);
  assert.match(source, /'medical:' \+ session\.sessionId \+ ':' \+ session\.position/);
  assert.match(source, /receipt\.answerOptionId/);
  assert.match(source, /String\.fromCharCode\(65 \+ index\)/);
  assert.match(source, /Answer keys and explanations are revealed only after the server records the attempt/);
  assert.doesNotMatch(source, /learnerId\s*:/);
});

test('cloud account exposes medical QBank only when published questions exist', async () => {
  const source = await readFile(new URL('../web/account.js', import.meta.url), 'utf8');
  assert.match(source, /const medicalAction = count \?/);
  assert.match(source, /\/web\/medical\.html/);
});


test('medical option labels have explicit visual separation from option text', async () => {
  const css = await readFile(new URL('../web/styles.css', import.meta.url), 'utf8');
  assert.match(css, /#medical-app \.option-letter/);
  assert.match(css, /margin-right:\.35rem/);
});


test('medical overview reads revision due state without making it mastery', async () => {
  const source = await readFile(new URL('../web/medical.js', import.meta.url), 'utf8');
  assert.match(source, /cloud\.due\(15\)/);
  assert.match(source, /load_revision_due/);
  assert.match(source, /Scheduling state is not a mastery score/);
  assert.match(source, /The medical QBank still works/);
});


test('medical revision panel exposes time-budget Study Now for due or unseen candidates', async () => {
  const source = await readFile(new URL('../web/medical.js', import.meta.url), 'utf8');
  assert.match(source, /revision && \(revision\.dueCount \|\| revision\.unseenCount\)/);
  assert.match(source, /\[10, 20, 30, 60\]/);
  assert.match(source, /How much uninterrupted time do you have\?/);
  assert.match(source, /cloud\.studyNow\(availableMinutes, 50\)/);
  assert.match(source, /Future reviews were not pulled early/);
});


test('Study Now UI can offer unseen new learning without calling it mastery', async () => {
  const source = await readFile(new URL('../web/medical.js', import.meta.url), 'utf8');
  assert.match(source, /revision\.dueCount \|\| revision\.unseenCount/);
  assert.match(source, /unseen published question/);
  assert.match(source, /explainable candidate classes/);
  assert.doesNotMatch(source, /mastery score.*Study Now score/i);
});


test('post-answer memory rating is optional, four-grade and separate from score', async () => {
  const source = await readFile(new URL('../web/medical.js', import.meta.url), 'utf8');
  assert.match(source, /How did recall feel before seeing the answer\?/);
  assert.match(source, /\[\[1, 'Again'\], \[2, 'Hard'\], \[3, 'Good'\], \[4, 'Easy'\]\]/);
  assert.match(source, /It does not change your score or block Next/);
  assert.match(source, /recordMemoryRating/);
  assert.match(source, /cloud\.memoryJudgment/);
  assert.match(source, /data-action="next"/);
});


test('medical study loop deep-links exact concept identity into NeuralVault', async () => {
  const source = await readFile(new URL('../web/medical.js', import.meta.url), 'utf8');
  assert.match(source, /new URLSearchParams\(\{ concept: primaryConceptId \}\)/);
  assert.match(source, /\/web\/vault\.html\?/);
  assert.match(source, /Open concept in NeuralVault/);
});


test('medical NeuralVault link tolerates old learner payloads via primary conceptLinks fallback', async () => {
  const source = await readFile(new URL('../web/medical.js', import.meta.url), 'utf8');
  assert.match(source, /q\.conceptId \|\| q\.conceptLinks\?\.find/);
  assert.match(source, /role === 'primary'/);
  assert.match(source, /new URLSearchParams\(\{ concept: primaryConceptId \}\)/);
});


test('answered Study Now item carries recommendation reason into NeuralVault handoff', async () => {
  const source = await readFile(new URL('../web/medical.js', import.meta.url), 'utf8');
  assert.match(source, /Why Study Now sent this/);
  assert.match(source, /'mistake-repair'/);
  assert.match(source, /'due-revision'/);
  assert.match(source, /'new-learning'/);
  assert.match(source, /vaultParams\.set\('from', 'study-now'\)/);
  assert.match(source, /vaultParams\.set\('reason', recommendationReason\)/);
  assert.match(source, /Review this concept in NeuralVault/);
});


test('medical overview shows full-mock capacity without overstating blueprint fidelity', async () => {
  const source = await readFile(new URL('../web/medical.js', import.meta.url), 'utf8');
  assert.match(source, /cloud\.examSimulatorReadiness\('neet-pg:2026@1'\)/);
  assert.match(source, /unique reviewed questions ready/);
  assert.match(source, /more distinct published questions are required/);
  assert.match(source, /does not claim exam-blueprint fidelity/);
  assert.match(source, /The QBank and Study Now remain available/);
  assert.doesNotMatch(source, /Start full mock/);
});


test('medical study view renders blind-first-look media without diagnosis or annotation metadata', async () => {
  const source = await readFile(new URL('../web/medical.js', import.meta.url), 'utf8');
  assert.match(source, /questionMedia\(q\.media\)/);
  assert.match(source, /blind first look/);
  assert.match(source, /safeMediaUrl/);
  assert.match(source, /url\.protocol === 'https:'/);
  assert.match(source, /referrerpolicy="no-referrer"/);
  assert.doesNotMatch(source, /diagnosisEvidence/);
  assert.doesNotMatch(source, /annotationVersionId/);
  assert.doesNotMatch(source, /rightsStatus/);
});

test('medical image layout remains responsive and bounded', async () => {
  const css = await readFile(new URL('../web/styles.css', import.meta.url), 'utf8');
  assert.match(css, /\.question-media-list/);
  assert.match(css, /\.question-media img/);
  assert.match(css, /object-fit:contain/);
  assert.match(css, /max-height:560px/);
  assert.match(css, /@media\(max-width:650px\).*\.question-media img\{max-height:420px\}/s);
});


test('medical overview links to dedicated Exam Mode without embedding exam state machine', async () => {
  const source = await readFile(new URL('../web/medical.js', import.meta.url), 'utf8');
  assert.match(source, /href="\/web\/exam\.html"/);
  assert.match(source, /Open Exam Mode/);
  assert.doesNotMatch(source, /setExamRunAnswer/);
  assert.doesNotMatch(source, /setExamRunReview/);
});


test('incorrect-answer UI prefers validated canonical teaching receipt and keeps legacy fallback', async () => {
  const source = await readFile(new URL('../web/medical.js', import.meta.url), 'utf8');
  assert.match(source, /function canonicalTeachingFeedback\(receipt\)/);
  assert.match(source, /post-answer-canonical-v1/);
  assert.match(source, /grounded-teaching-output/);
  assert.match(source, /sourceMode !== 'canonical_fallback'/);
  assert.match(source, /REVIEWED TEACHING/);
  assert.match(source, /Quick retrieval/);
  assert.match(source, /canonicalTeaching \|\|/);
  assert.match(source, /receipt\.explanation/);
});

test('correct answers do not enter the canonical remediation block', async () => {
  const source = await readFile(new URL('../web/medical.js', import.meta.url), 'utf8');
  assert.match(source, /receipt\?\.event\?\.correct !== false/);
  assert.match(source, /receipt\.event\?\.correct \? 'Correct\.'/);
});


test('medical learner uses visual route only for explicit server detection descriptor', async () => {
  const source = await readFile(new URL('../web/medical.js', import.meta.url), 'utf8');
  assert.match(source, /function visualDetectionDescriptor\(question\)/);
  assert.match(source, /descriptor\?\.taskType !== 'detection'/);
  assert.match(source, /question\.media\.some\(item => item\?\.mediaAssetVersionId === descriptor\.mediaAssetVersionId\)/);
  assert.match(source, /cloud\.visualDetection\(session\.sessionId/);
  assert.match(source, /mediaAssetVersionId: visualDetection\.mediaAssetVersionId/);
  assert.match(source, /helpUsed: false/);
  assert.match(source, /receipt = result\.attemptReceipt/);
  assert.match(source, /visual_detection_receipt_invalid/);
});

test('medical visual UI never computes correctness or invents target concept', async () => {
  const source = await readFile(new URL('../web/medical.js', import.meta.url), 'utf8');
  const start = source.indexOf('async function answerCurrent()');
  const end = source.indexOf('async function recordMemoryRating', start);
  const answerFlow = source.slice(start, end);
  assert.doesNotMatch(answerFlow, /answerOptionId\s*===/);
  assert.doesNotMatch(answerFlow, /correct\s*:/);
  assert.doesNotMatch(answerFlow, /targetConceptId\s*:/);
  assert.match(answerFlow, /cloud\.answer/);
  assert.match(answerFlow, /cloud\.visualDetection/);
});

test('visual detection affordance remains evidence language rather than mastery language', async () => {
  const [source, css] = await Promise.all([
    readFile(new URL('../web/medical.js', import.meta.url), 'utf8'),
    readFile(new URL('../web/styles.css', import.meta.url), 'utf8')
  ]);
  assert.match(source, /IMAGE RECOGNITION · SERVER SCORED/);
  assert.match(source, /Visual recognition evidence saved/);
  assert.match(source, /stored separately from your scored question attempt/);
  assert.match(css, /\.visual-task-note/);
  assert.match(css, /\.visual-evidence-status/);
});
