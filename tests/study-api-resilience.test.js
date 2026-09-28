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
  assert.match(source, /livePolicyId: evidence\.livePolicyId \?\? "bootstrap-binary-v1"/);
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


test('schedule policy ledger records authoritative and shadow proposals without blocking study', async () => {
  const source = await readFile(new URL('../supabase/functions/study-api/index.ts', import.meta.url), 'utf8');
  assert.match(source, /study_record_schedule_decision/);
  assert.match(source, /event: "schedule_decision_deferred"/);
  assert.match(source, /role: "authoritative"/);
  assert.match(source, /policyId: "fsrs-shadow"/);
  assert.match(source, /latestAttempt\?\.id === attemptId/);
  assert.match(source, /fsrs_shadow_decision_deferred/);
  assert.match(source, /authoritative_schedule_decision_deferred/);
});

test('policy evaluation endpoint is learner-scoped and explicitly non-causal', async () => {
  const source = await readFile(new URL('../supabase/functions/study-api/index.ts', import.meta.url), 'utf8');
  assert.match(source, /path === "\/revision\/policy-evaluation"/);
  assert.match(source, /study_schedule_policy_outcomes/);
  assert.match(source, /p_learner: learnerId/);
  assert.match(source, /scope: "descriptive-schedule-policy-outcomes"/);
  assert.match(source, /causal: false/);
  assert.match(source, /livePolicyId: "bootstrap-binary-v1"/);
  assert.match(source, /scheduleDecisions/);
});


test('NeuralVault API derives learner identity and separates canonical content from personal annotations', async () => {
  const source = await readFile(new URL('../supabase/functions/study-api/index.ts', import.meta.url), 'utf8');
  assert.match(source, /vaultConceptMatch/);
  assert.match(source, /neural_catalog_concept/);
  assert.match(source, /neural_canonical_note_versions/);
  assert.match(source, /neural_personal_annotations/);
  assert.match(source, /\.eq\("learner_id", learnerId\)/);
  assert.match(source, /canonicalNote/);
  assert.match(source, /annotations/);
});

test('NeuralVault mutations use trusted RPCs, optimistic revisions and browser-safe CORS', async () => {
  const source = await readFile(new URL('../supabase/functions/study-api/index.ts', import.meta.url), 'utf8');
  assert.match(source, /GET, POST, PATCH, DELETE, OPTIONS/);
  assert.match(source, /path === "\/vault\/annotations"/);
  assert.match(source, /neural_create_annotation/);
  assert.match(source, /neural_update_annotation/);
  assert.match(source, /expectedRevision/);
  assert.match(source, /neural_delete_annotation/);
  assert.match(source, /jsonBody\(req, 24576\)/);
});

test('learner export includes personal NeuralVault annotations', async () => {
  const source = await readFile(new URL('../supabase/functions/study-api/index.ts', import.meta.url), 'utf8');
  assert.match(source, /getVaultAnnotations/);
  assert.match(source, /neuralVault:/);
  assert.match(source, /annotations: vaultAnnotations/);
});


test('NeuralVault concept route decodes encoded canonical IDs and enforces note byte ceiling', async () => {
  const source = await readFile(new URL('../supabase/functions/study-api/index.ts', import.meta.url), 'utf8');
  assert.match(source, /decodeURIComponent\(vaultConceptMatch\[1\]\)/);
  assert.match(source, /new TextEncoder\(\)\.encode\(input\.bodyMarkdown\)\.byteLength > 20000/);
});


test('NeuralVault concept index comes from canonical catalog identity with learner note counts', async () => {
  const source = await readFile(new URL('../supabase/functions/study-api/index.ts', import.meta.url), 'utf8');
  assert.match(source, /path === "\/vault\/concepts"/);
  assert.match(source, /catalog\.body\?\.concepts/);
  assert.match(source, /annotationCounts/);
  assert.match(source, /canonicalByConcept/);
  assert.match(source, /catalogVersion/);
});


test('NeuralVault search is learner-scoped and never searches unpublished canonical notes', async () => {
  const source = await readFile(new URL('../supabase/functions/study-api/index.ts', import.meta.url), 'utf8');
  assert.match(source, /path === "\/vault\/search"/);
  assert.match(source, /q\.length < 2 \|\| q\.length > 120/);
  assert.match(source, /vault_search_canonical/);
  assert.match(source, /\.eq\("status", "published"\)/);
  assert.match(source, /getVaultAnnotations\(\)/);
  assert.match(source, /matchedIn/);
});

test('NeuralVault concept detail exposes update-aware annotation anchor state', async () => {
  const source = await readFile(new URL('../supabase/functions/study-api/index.ts', import.meta.url), 'utf8');
  assert.match(source, /"current"/);
  assert.match(source, /"canonical-updated"/);
  assert.match(source, /"anchor-unavailable"/);
  assert.match(source, /"unanchored"/);
});


test('learner question exposes stable primary canonical concept identity', async () => {
  const source = await readFile(new URL('../supabase/functions/study-api/index.ts', import.meta.url), 'utf8');
  assert.match(source, /const primaryConcept = q\.conceptLinks\?\.find/);
  assert.match(source, /conceptId: primaryConcept\?\.conceptId \?\? null/);
});


test('Study Now session state restores explainable recommendation context from immutable receipt', async () => {
  const source = await readFile(new URL('../supabase/functions/study-api/index.ts', import.meta.url), 'utf8');
  assert.match(source, /session_recommendation_context/);
  assert.match(source, /study_recommendation_events/);
  assert.match(source, /\.eq\("session_id", sessionId\)/);
  assert.match(source, /\.eq\("learner_id", learnerId\)/);
  assert.match(source, /"mistake-repair", "due-revision", "new-learning"/);
  assert.match(source, /source: "study-now"/);
  assert.match(source, /recommendationContext/);
});


test('concept diagnostics expose observations and explicitly withhold mastery inference', async () => {
  const source = await readFile(new URL('../supabase/functions/study-api/index.ts', import.meta.url), 'utf8');
  assert.match(source, /path === "\/diagnostics\/concepts"/);
  assert.match(source, /study_concept_evidence/);
  assert.match(source, /p_learner: learnerId/);
  assert.match(source, /scope: "observed-concept-evidence"/);
  assert.match(source, /inferenceEnabled: false/);
  assert.match(source, /knowledgeState: "unestimated"/);
  assert.match(source, /mastery: null/);
  assert.match(source, /forgetting: null/);
  assert.match(source, /confidence: null/);
});

test('concept diagnostics preserve uncertainty from sparse and missing evidence', async () => {
  const source = await readFile(new URL('../supabase/functions/study-api/index.ts', import.meta.url), 'utf8');
  assert.match(source, /single-question-version-only/);
  assert.match(source, /no-repeat-retrieval/);
  assert.match(source, /no-memory-self-report/);
  assert.match(source, /partial-memory-self-report/);
  assert.match(source, /transfer-evidence-not-modeled/);
  assert.match(source, /concept-not-in-current-catalog/);
});


test('mistake diagnostics expose observed error patterns without inferring causes', async () => {
  const source = await readFile(new URL('../supabase/functions/study-api/index.ts', import.meta.url), 'utf8');
  assert.match(source, /path === "\/diagnostics\/mistakes"/);
  assert.match(source, /study_mistake_evidence/);
  assert.match(source, /p_learner: learnerId/);
  assert.match(source, /scope: "observed-mistake-evidence"/);
  assert.match(source, /causeInferenceEnabled: false/);
  assert.match(source, /causes: \[\]/);
  assert.match(source, /error-cause-not-observed/);
  assert.match(source, /single-question-version-error-evidence/);
  assert.match(source, /no-error-memory-self-report/);
  assert.match(source, /transfer-error-pattern-not-modeled/);
});

test('mistake diagnostics expose question text only for currently published versions', async () => {
  const source = await readFile(new URL('../supabase/functions/study-api/index.ts', import.meta.url), 'utf8');
  assert.match(source, /publishedQuestionMap/);
  assert.match(source, /currentQuestion: currentQuestion \?/);
  assert.match(source, /stem: currentQuestion\.stem/);
  assert.match(source, /: null/);
});


test('Exam DNA endpoint exposes descriptive historical evidence without prediction', async () => {
  const source = await readFile(new URL('../supabase/functions/study-api/index.ts', import.meta.url), 'utf8');
  assert.match(source, /path === "\/exam-dna"/);
  assert.match(source, /exam_dna_observations/);
  assert.match(source, /p_exam_id: examId/);
  assert.match(source, /exam_dna_projection_failed/);
  assert.doesNotMatch(source, /examDnaPrediction|predictedChance|forecastScore/);
});

test('Exam DNA endpoint validates optional exam identity instead of accepting arbitrary query text', async () => {
  const source = await readFile(new URL('../supabase/functions/study-api/index.ts', import.meta.url), 'utf8');
  assert.match(source, /searchParams\.get\("examId"\)/);
  assert.match(source, /examParam === null \|\| examParam === "" \? null : identifier\(examParam\)/);
});


test('exam simulator readiness stays read-only while trusted run start owns assembly', async () => {
  const source = await readFile(new URL('../supabase/functions/study-api/index.ts', import.meta.url), 'utf8');
  assert.match(source, /path === "\/exam-simulator\/readiness"/);
  assert.match(source, /searchParams\.get\("ruleSetId"\)/);
  assert.match(source, /exam_rule_set_required/);
  assert.match(source, /exam_mock_readiness/);
  assert.match(source, /p_rule_set_id: ruleSetId/);
  assert.match(source, /exam_mock_readiness_failed/);

  const startRoute = source.indexOf('path === "/exam-simulator/runs"');
  const readinessRoute = source.indexOf('path === "/exam-simulator/readiness"');
  const assemblyCall = source.indexOf('admin.rpc("exam_assemble_mock"', startRoute);
  assert.ok(startRoute >= 0 && assemblyCall > startRoute && readinessRoute > assemblyCall);
});


test('media prompt API exposes only published-question media through the trusted service RPC', async () => {
  const source = await readFile(new URL('../supabase/functions/study-api/index.ts', import.meta.url), 'utf8');
  assert.match(source, /path === "\/media"/);
  assert.match(source, /questionVersionId/);
  assert.match(source, /publishedQuestions\(catalog\.body\)\.some/);
  assert.match(source, /admin\.rpc\("content_media_prompt"/);
  assert.match(source, /question_not_available/);
  assert.match(source, /media_prompt_failed/);
  assert.doesNotMatch(source, /content_media_assets"\)\.select/);
});


test('session state binds learner-safe media prompt to the exact published question', async () => {
  const source = await readFile(new URL('../supabase/functions/study-api/index.ts', import.meta.url), 'utf8');
  const sessionQuestion = source.indexOf('const q = publishedQuestions(body).find');
  const mediaRpc = source.indexOf('await learnerMediaPrompt(q.questionVersionId)', sessionQuestion);
  assert.ok(sessionQuestion >= 0 && mediaRpc > sessionQuestion);
  assert.match(source, /const sourceMedia = Array\.isArray\(data\?\.media\) \? data\.media : \[\]/);
  assert.match(source.slice(sessionQuestion, mediaRpc + 700), /learnerMediaPrompt\(q\.questionVersionId\)/);
  assert.match(source.slice(sessionQuestion, mediaRpc + 900), /media: mediaPrompt\.media/);
});


test('private storage media refs become short-lived signed learner URLs', async () => {
  const source = await readFile(new URL('../supabase/functions/study-api/index.ts', import.meta.url), 'utf8');
  assert.match(source, /const learnerMediaPrompt = async/);
  assert.match(source, /storage:\/\/mlos-media\//);
  assert.match(source, /\.from\("mlos-media"\)\s*\.createSignedUrl\(objectPath, 900\)/s);
  assert.match(source, /deliveryRef: signed\.signedUrl/);
  assert.match(source, /objectPath\.includes\("\.\."\)/);
  assert.match(source, /media_delivery_ref_invalid/);
  assert.match(source, /media_delivery_failed/);
});

test('both session state and explicit media endpoint use the same signed-media resolver', async () => {
  const source = await readFile(new URL('../supabase/functions/study-api/index.ts', import.meta.url), 'utf8');
  assert.match(source, /const mediaPrompt = await learnerMediaPrompt\(q\.questionVersionId\)/);
  assert.match(source, /response\(req, 200, await learnerMediaPrompt\(questionVersionId\)\)/);
});


test('incorrect answer receipt carries deterministic canonical grounded teaching without provider dependency', async () => {
  const source = await readFile(new URL('../supabase/functions/study-api/index.ts', import.meta.url), 'utf8');
  assert.match(source, /buildCanonicalPostAnswerTeaching/);
  assert.match(source, /correct: event\.correct/);
  assert.match(source, /conceptId: primary\.conceptId/);
  assert.match(source, /explanation: q\.explanation/);
  assert.match(source, /teachingDecision: postAnswerTeaching\?\.decision \?\? null/);
  assert.match(source, /teaching: postAnswerTeaching\?\.teaching \?\? null/);
  assert.doesNotMatch(source, /openai|gemini|anthropic/i);
});



test('learner corrections stay learner-scoped and never gain canonical or learner-model authority', async () => {
  const source = await readFile(new URL('../supabase/functions/study-api/index.ts', import.meta.url), 'utf8');
  assert.match(source, /path === "\/vault\/corrections"/);
  assert.match(source, /neural_create_personal_correction/);
  assert.match(source, /p_learner: learnerId/);
  assert.match(source, /annotation_kind,correction_target_type,correction_target_id,correction_target_sha256/);
  assert.match(source, /targetState/);
  assert.match(source, /"question-retired"/);
  assert.match(source, /"canonical-updated"/);
  assert.doesNotMatch(source, /p_learner:\s*input\./);
});

test('learner content reports require explicit correction sharing and cannot affect learning state', async () => {
  const source = await readFile(new URL('../supabase/functions/study-api/index.ts', import.meta.url), 'utf8');
  assert.match(source, /path === "\/content-reports"/);
  assert.match(source, /typeof input\.shareCorrection !== "boolean"/);
  assert.match(source, /p_share_correction: input\.shareCorrection/);
  assert.match(source, /p_correction_annotation_id: correctionAnnotationId/);
  assert.match(source, /data\?\.canonicalAuthority !== false/);
  assert.match(source, /data\?\.learnerModelAuthority !== false/);
  const start = source.indexOf('path === "/content-reports"');
  const end = source.indexOf('vaultAnnotationMatch', start);
  const route = source.slice(start, end);
  assert.doesNotMatch(route, /study_rebuild_revision_state|study_record_memory_judgment|study_start_recommendation_session/);
});
