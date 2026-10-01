import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { publicFileSet } from '../scripts/public-surface.js';

test('reviewer UI requires source-rights resolution before rights approval', async () => {
  const source = await readFile(new URL('../web/review.js', import.meta.url), 'utf8');

  assert.match(source, /source-rights-form/);
  assert.match(source, /citation_only/);
  assert.match(source, /public_domain/);
  assert.match(source, /licensed/);
  assert.match(source, /restricted/);
  assert.match(source, /Resolve source rights/);
  assert.match(source, /Resolve source rights before approval/);
  assert.match(source, /!rightsReady/);
  assert.match(source, /review\.resolveRights/);
  assert.doesNotMatch(source, /reviewerId\s*:/);
});

test('reviewer UI can switch between question and NeuralVault canonical note targets', async () => {
  const source = await readFile(new URL('../web/review.js', import.meta.url), 'utf8');
  assert.match(source, /review-target/);
  assert.match(source, /NeuralVault canonical notes/);
  assert.match(source, /review\.noteQueue/);
  assert.match(source, /noteReviewItem/);
  assert.match(source, /recordStructuredBatch/);
  assert.match(source, /neural_note_version/);
  assert.match(source, /structuredReviewControls/);
});

test('NeuralVault reviewer card shows provenance before gate decision', async () => {
  const source = await readFile(new URL('../web/review.js', import.meta.url), 'utf8');
  assert.match(source, /const provenance = note\?\.provenance/);
  assert.match(source, /<h3>Provenance<\/h3>/);
  assert.match(source, /provenance\.kind/);
  assert.match(source, /provenance\.evidence/);
});

test('reviewer UI shows descriptive pipeline backlog without granting intake authority', async () => {
  const source = await readFile(new URL('../web/review.js', import.meta.url), 'utf8');
  assert.match(source, /review\.pipelineStatus\(\)/);
  assert.match(source, /Review backlog/);
  assert.match(source, /Medical pending/);
  assert.match(source, /References pending/);
  assert.match(source, /Rights pending/);
  assert.match(source, /Published stable questions/);
  assert.match(source, /publicationAuthority/);
  assert.match(source, /Semantic near-duplicate detection/);
  assert.doesNotMatch(source, /content_stage_intake_batch|content_promote_intake_batch/);
});

test('pipeline status failure does not block the review queue', async () => {
  const source = await readFile(new URL('../web/review.js', import.meta.url), 'utf8');
  assert.match(source, /pipelineStatus\(\)\.catch/);
  assert.match(source, /return state\.pipelineStatus/);
  assert.match(source, /Promise\.all\(\[\s*queuePromise,\s*pipelinePromise,\s*assistPromise/s);
});

test('reviewer UI presents AI/source preflight without granting approval authority', async () => {
  const source = await readFile(new URL('../web/review.js', import.meta.url), 'utf8');
  assert.match(source, /content-review-assist\.json/);
  assert.match(source, /AI\/source preflight/);
  assert.match(source, /Non-authoritative/);
  assert.match(source, /cannot approve, verify or publish content/);
  assert.match(source, /Independently inspect the question and cited source/);
  assert.doesNotMatch(source, /autoApprove|automaticApproval|reviewAssist.*decision\s*=/);
});

test('review assist failure is nonblocking for authenticated review queues', async () => {
  const source = await readFile(new URL('../web/review.js', import.meta.url), 'utf8');
  assert.match(source, /fetch\('\/data\/content-review-assist\.json'/);
  assert.match(source, /\.catch\(\(\) => state\.reviewAssist\)/);
  assert.match(source, /Promise\.all\(\[\s*queuePromise,\s*pipelinePromise,\s*assistPromise/s);
});

test('normal question and note review is zero-typing while AI/source preflight stays non-authoritative', async () => {
  const source = await readFile(new URL('../web/review.js', import.meta.url), 'utf8');
  assert.match(source, /ZERO-TYPING REVIEW/);
  assert.match(source, /quick-structured-review/);
  assert.match(source, /server generates the audit note/);
  assert.match(source, /recordStructuredBatch/);
  assert.doesNotMatch(source, /class="review-decision-form"/);
  assert.doesNotMatch(source, /requestSubmit\(/);
});

test('source-policy assist prefills evidence but never selects or submits a rights outcome', async () => {
  const source = await readFile(new URL('../web/review.js', import.meta.url), 'utf8');
  assert.match(source, /use-rights-assist-evidence/);
  assert.match(source, /draftRightsEvidence/);
  assert.match(source, /Rights evidence already contains text/);
  assert.match(source, /Independently choose the rights outcome/);
  assert.doesNotMatch(source, /rightsStatus\.value\s*=/);
  assert.doesNotMatch(source, /requestSubmit\(/);
});

test('reviewer UI renders exact visual target before a gate decision', async () => {
  const source = await readFile(new URL('../web/review.js', import.meta.url), 'utf8');
  assert.match(source, /function mediaReviewPanel\(item\)/);
  assert.match(source, /MEDIA-BOUND REVIEW/);
  assert.match(source, /Inspect the exact visual target/);
  assert.match(source, /packet\.targetSha256/);
  assert.match(source, /JSON\.stringify\(packet\.target/);
  assert.match(source, /mediaReviewPanel\(item\)/);
  assert.match(source, /referrerpolicy="no-referrer"/);
});

test('reviewer visual surface accepts only https signed media delivery', async () => {
  const source = await readFile(new URL('../web/review.js', import.meta.url), 'utf8');
  assert.match(source, /function safeReviewMediaUrl\(value\)/);
  assert.match(source, /parsed\.protocol === 'https:'/);
  assert.match(source, /Media unavailable/);
});

test('rights review compresses repeated source work into a source-first unique backlog', async () => {
  const source = await readFile(new URL('../web/review.js', import.meta.url), 'utf8');
  assert.match(source, /function rightsSourceBacklogPanel\(\)/);
  assert.match(source, /SOURCE-FIRST RIGHTS/);
  assert.match(source, /Resolve unique sources before repeated question review/);
  assert.match(source, /question-level Rights & provenance approval still remains separate/);
  assert.match(source, /new Map\(\)/);
  assert.match(source, /questionIds: new Set\(\)/);
  assert.match(source, /b\.questionIds\.size - a\.questionIds\.size/);
  assert.match(source, /impactCount: entry\.questionIds\.size/);
  assert.match(source, /allowResolve: state\.selectedKind !== 'rights'/);
  assert.match(source, /rightsSourceBacklogPanel\(\)/);
});

test('rights question cards wait for source resolution without hiding restricted-source rejection targets', async () => {
  const source = await readFile(new URL('../web/review.js', import.meta.url), 'utf8');
  assert.match(source, /function questionSourcesHaveResolvedRights\(item\)/);
  assert.match(source, /source\?\.rights\?\.status \|\| 'unknown'/);
  assert.match(source, /!== 'unknown'/);
  assert.match(source, /focusedItems\.filter\(questionSourcesHaveResolvedRights\)/);
  assert.match(source, /hidden until every referenced source has a recorded rights status/);
  assert.match(source, /Source resolution does not approve any question/);
  assert.doesNotMatch(source, /source\?\.rights\?\.status === 'restricted'.*return false/s);
});

test('References source focus narrows questions and notes without recording a shared decision', async () => {
  const source = await readFile(new URL('../web/review.js', import.meta.url), 'utf8');
  assert.equal(publicFileSet.has('src/domain/references-source-focus.js'), true);
  assert.match(source, /function referencesSourcePanel\(\)/);
  assert.match(source, /SOURCE-FOCUSED REFERENCES/);
  assert.match(source, /filterReferencesBySource\(experimentItems, state\.referencesSourceId\)/);
  assert.match(source, /state\.referencesExperimentArm !== 'all'/);
  assert.match(source, /Shared inspection is not shared approval/);
  assert.match(source, /data-action="references-source-focus"/);
  assert.doesNotMatch(source, /references-source-focus[\s\S]{0,300}review\.record\(/);
});

test('reviewer UI triages learner reports without exposing learner identity or editing canonical content', async () => {
  const source = await readFile(new URL('../web/review.js', import.meta.url), 'utf8');
  assert.match(source, /LEARNER REPORT TRIAGE/);
  assert.match(source, /Learner identity is intentionally not exposed/);
  assert.match(source, /Report count is a prioritization signal only, never a vote on medical truth/);
  assert.match(source, /review\.learnerReports\(\)/);
  assert.match(source, /review\.triageLearnerReports/);
  assert.match(source, /Correction required/);
  assert.match(source, /creates no edit and no publication/);
  assert.doesNotMatch(source, /learnerId\s*:/);
});

test('learner report inbox failure is nonblocking for the normal review queue', async () => {
  const source = await readFile(new URL('../web/review.js', import.meta.url), 'utf8');
  assert.match(source, /review\.learnerReports\(\)[\s\S]*\.catch/);
  assert.match(source, /Report inbox temporarily unavailable/);
  assert.match(source, /Normal content review remains available/);
});
