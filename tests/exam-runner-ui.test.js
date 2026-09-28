import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../web/exam.js', import.meta.url), 'utf8');
const html = await readFile(new URL('../web/exam.html', import.meta.url), 'utf8');
const css = await readFile(new URL('../web/styles.css', import.meta.url), 'utf8');

test('Exam Mode uses authenticated server run APIs rather than a client exam engine', () => {
  assert.match(source, /createSupabaseAuth/);
  assert.match(source, /createCloudStudy/);
  assert.match(source, /cloud\.resumeExamRun\(\)/);
  assert.match(source, /cloud\.startExamRun\(RULE_SET_ID\)/);
  assert.match(source, /cloud\.startTestExamRun\(RULE_SET_ID\)/);
  assert.match(source, /cloud\.examRun\(runId\)/);
  assert.match(source, /cloud\.setExamRunAnswer/);
  assert.match(source, /cloud\.setExamRunReview/);
  assert.match(source, /cloud\.cancelExamRun/);
  assert.doesNotMatch(source, /answerOptionId/);
  assert.doesNotMatch(source, /learnerId\s*:/);
});

test('Exam Mode supports current-section navigation without early section advance', () => {
  assert.match(source, /exam-palette-grid/);
  assert.match(source, /data-action="jump"/);
  assert.match(source, /data-action="previous"/);
  assert.match(source, /data-action="next-question"/);
  assert.match(source, /The next section opens only when the server timer closes this one/);
  assert.doesNotMatch(source, /advanceSection/);
  assert.doesNotMatch(source, /next-section/);
});

test('Exam Mode timer uses server clock offset and refreshes at section expiry', () => {
  assert.match(source, /Date\.parse\(run\.serverNow\) - Date\.now\(\)/);
  assert.match(source, /scheduledEndAt/);
  assert.match(source, /setInterval\(tickClock, 1000\)/);
  assert.match(source, /remaining <= 0/);
  assert.match(source, /refreshRun\(\)/);
  assert.match(source, /Server authoritative/);
});

test('Exam Mode preserves blind-first-look media safety', () => {
  assert.match(source, /questionMedia\(q\.media\)/);
  assert.match(source, /safeMediaUrl/);
  assert.match(source, /url\.protocol === 'https:'/);
  assert.match(source, /referrerpolicy="no-referrer"/);
  assert.match(source, /blind first look/);
  assert.doesNotMatch(source, /diagnosisEvidence/);
  assert.doesNotMatch(source, /annotationVersionId/);
  assert.doesNotMatch(source, /rightsStatus/);
});

test('Exam Mode distinguishes internal engineering content from production', () => {
  assert.match(source, /INTERNAL ENGINEERING TEST/);
  assert.match(source, /Engineering lane only/);
  assert.match(source, /productionEquivalent/);
  assert.match(source, /internal_exam_test_forbidden/);
  assert.match(source, /examSimulatorTestReadiness/);
});

test('completed exam loads descriptive GT Autopsy and cancelled exam does not', () => {
  assert.match(source, /cloud\.examRunAutopsy\(runId\)/);
  assert.match(source, /GT AUTOPSY · DESCRIPTIVE V1/);
  assert.match(source, /does not infer mastery, fatigue, confidence or preventable marks/);
  assert.match(source, /No completion score was created/);
  assert.match(source, /receives no GT Autopsy/);
});

test('Exam Mode uses revisioned idempotent mutations', () => {
  assert.match(source, /expectedRevision:run\.revision/);
  assert.match(source, /crypto\.randomUUID\(\)/);
  assert.match(source, /exam-answer:/);
  assert.match(source, /exam-review:/);
  assert.match(source, /exam-cancel:/);
});

test('Exam Mode has a dedicated responsive shell', () => {
  assert.match(html, /id="exam-app"/);
  assert.match(html, /src="\/web\/exam\.js"/);
  assert.match(css, /\.exam-layout\{display:grid/);
  assert.match(css, /grid-template-columns:300px minmax\(0,1fr\)/);
  assert.match(css, /\.exam-palette-grid/);
  assert.match(css, /@media\(max-width:900px\).*\.exam-layout\{grid-template-columns:1fr\}/s);
  assert.match(css, /@media\(max-width:650px\).*\.exam-palette-grid\{grid-template-columns:repeat\(6,1fr\)/s);
});
