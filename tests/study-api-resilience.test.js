import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('study-api retries only the transient PGRST303 trusted-read failure once', async () => {
  const source = await readFile(new URL('../supabase/functions/study-api/index.ts', import.meta.url), 'utf8');

  assert.match(source, /const trustedRead = async/);
  assert.match(source, /result\.error\?\.code === "PGRST303"/);
  assert.match(source, /setTimeout\(resolve, 75\)/);
  assert.match(source, /trusted_read_retry/);

  for (const operation of [
    'catalog',
    'attempts',
    'bookmarks',
    'revision_state',
    'open_session',
    'recommendation_events',
    'session_state',
    'session_receipt',
    'export_sessions',
    'answer_session'
  ]) {
    assert.match(source, new RegExp(`trustedRead\\("${operation}"`));
  }

  // Mutations remain direct and are not blindly retried.
  assert.doesNotMatch(source, /trustedRead\([^\n]+[\s\S]{0,250}\.upsert\(/);
  assert.doesNotMatch(source, /trustedRead\([^\n]+[\s\S]{0,250}\.delete\(/);
  assert.doesNotMatch(source, /trustedRead\([^\n]+[\s\S]{0,250}\.rpc\(/);
});


test('study-api revision projection is non-authoritative for attempt writes', async () => {
  const source = await readFile(new URL('../supabase/functions/study-api/index.ts', import.meta.url), 'utf8');

  assert.match(source, /path === "\/revision\/due"/);
  assert.match(source, /study_rebuild_revision_state/);
  assert.match(source, /revision_projection_failed/);
  assert.match(source, /revision_projection_deferred/);
  assert.match(source, /if \(revisionError\) \{/);
  assert.match(source, /return response\(req, 200, data\?\.receipt \?\? receipt\)/);
  assert.doesNotMatch(source, /if \(revisionError\) fail\(/);
});


test('study-api Study Now is learner-scoped, time-budgeted and resumes interruptions', async () => {
  const source = await readFile(new URL('../supabase/functions/study-api/index.ts', import.meta.url), 'utf8');
  assert.match(source, /path === "\/study-now\/start"/);
  assert.match(source, /availableMinutes = integer\(input\.availableMinutes, 5, 120\)/);
  assert.match(source, /strategy: "due-then-new-v2"/);
  assert.match(source, /item\.row\.latest_correct === false \? "mistake-repair" : "due-revision"/);
  assert.match(source, /strategy: "resume-existing"/);
  assert.doesNotMatch(source, /answerOptionId[\s\S]{0,250}studyNow/);
});


test('Study Now atomically binds selection rationale to the created session', async () => {
  const source = await readFile(new URL('../supabase/functions/study-api/index.ts', import.meta.url), 'utf8');
  assert.match(source, /study_start_recommendation_session/);
  assert.match(source, /p_available_minutes: availableMinutes/);
  assert.match(source, /p_plan: plan/);
  assert.match(source, /recommendationId/);
  assert.match(source, /getRecommendationEvents/);
  assert.match(source, /recommendations/);
  assert.doesNotMatch(source, /p_plan: plan[\s\S]{0,800}study_start_session/);
});


test('Study Now keeps mistake repair, due revision and new learning explainable', async () => {
  const source = await readFile(new URL('../supabase/functions/study-api/index.ts', import.meta.url), 'utf8');
  assert.match(source, /"mistake-repair"/);
  assert.match(source, /"due-revision"/);
  assert.match(source, /"new-learning"/);
  assert.match(source, /strategy: "due-then-new-v2"/);
  assert.match(source, /unseenCount/);
  assert.match(source, /studyNowAvailableCount/);
  assert.doesNotMatch(source, /priorityScore|masteryScore|recommendationScore/);
});


test('Study Now outcomes stay server-derived and explicitly non-causal', async () => {
  const source = await readFile(new URL('../supabase/functions/study-api/index.ts', import.meta.url), 'utf8');
  assert.match(source, /path === "\/study-now\/outcomes"/);
  assert.match(source, /study_recommendation_outcomes/);
  assert.match(source, /p_learner: learnerId/);
  assert.match(source, /scope: "descriptive-recommendation-outcomes"/);
  assert.match(source, /causal: false/);
});


test('memory judgments are authenticated service-derived optional evidence', async () => {
  const source = await readFile(new URL('../supabase/functions/study-api/index.ts', import.meta.url), 'utf8');
  assert.match(source, /path === "\/memory-judgments"/);
  assert.match(source, /exactFields\(input, \["attemptId", "rating"\]\)/);
  assert.match(source, /integer\(input\.rating, 1, 4\)/);
  assert.match(source, /study_record_memory_judgment/);
  assert.match(source, /p_learner: learnerId/);
  assert.match(source, /session_memory_judgment/);
  assert.match(source, /memoryJudgments/);
});


test('FSRS shadow endpoint is learner-scoped and cannot control production due dates', async () => {
  const source = await readFile(new URL('../supabase/functions/study-api/index.ts', import.meta.url), 'utf8');
  assert.match(source, /path === "\/revision\/fsrs-shadow"/);
  assert.match(source, /study_fsrs_shadow_evidence/);
  assert.match(source, /p_learner: learnerId/);
  assert.match(source, /mode: "shadow-scheduler"/);
  assert.match(source, /schedulerControl: false/);
  assert.match(source, /shadowSchedule: null/);
  assert.match(source, /no_real_memory_ratings/);
});


test('FSRS shadow scheduler pins a deterministic stable engine without production authority', async () => {
  const source = await readFile(new URL('../supabase/functions/study-api/index.ts', import.meta.url), 'utf8');
  assert.match(source, /npm:ts-fsrs@5\.4\.2/);
  assert.match(source, /algorithmVersion: "FSRS-6"/);
  assert.match(source, /configVersion: "fsrs-shadow-default-v1"/);
  assert.match(source, /enableFuzz: false/);
  assert.match(source, /enableShortTerm: true/);
  assert.match(source, /buildFsrsShadowSchedule/);
  assert.match(source, /fsrsShadow\.next/);
  assert.match(source, /get_retrievability/);
  assert.match(source, /dueDeltaMs/);
  assert.match(source, /schedulerControl: false/);
  assert.match(source, /mode: "shadow-scheduler"/);
  assert.match(source, /no_real_memory_ratings/);
});


test('FSRS shadow schedule refuses partially rated question histories', async () => {
  const source = await readFile(new URL('../supabase/functions/study-api/index.ts', import.meta.url), 'utf8');
  assert.match(source, /evidence\?\.questionCoverage/);
  assert.match(source, /row\?\.fullyRated === true/);
  assert.match(source, /if \(!fullyRated\.has\(questionVersionId\)\) continue/);
  assert.match(source, /skippedIncompleteQuestionCount/);
});


test('FSRS shadow distinguishes sparse ratings from a complete replayable history', async () => {
  const source = await readFile(new URL('../supabase/functions/study-api/index.ts', import.meta.url), 'utf8');
  assert.match(source, /no_fully_rated_question_history/);
  assert.match(source, /shadowSchedule\?\.itemCount > 0/);
});
