import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';

const migrationsUrl = new URL('../supabase/migrations/', import.meta.url);
const migrationNames = await readdir(migrationsUrl);
const migrationName = migrationNames.find(name => /answer_confidence_beta\.sql$/.test(name));
const migration = migrationName
  ? await readFile(new URL(`../supabase/migrations/${migrationName}`, import.meta.url), 'utf8')
  : '';
const readOptional = async path => {
  try { return await readFile(new URL(path, import.meta.url), 'utf8'); }
  catch { return ''; }
};
const [confidenceApi, cloudStudy, confidenceUi, medicalHtml, publicSurface] = await Promise.all([
  readOptional('../supabase/functions/learner-experiment-api/index.ts'),
  readFile(new URL('../src/adapters/cloud-study.js', import.meta.url), 'utf8'),
  readOptional('../web/answer-confidence-beta.js'),
  readFile(new URL('../web/medical.html', import.meta.url), 'utf8'),
  readFile(new URL('../scripts/public-surface.js', import.meta.url), 'utf8')
]);

test('answer confidence is registered as a beta-only learner feature', () => {
  assert.ok(migrationName, 'answer-confidence migration must exist');
  assert.match(migration, /'answer_confidence_capture'/);
  assert.match(migration, /'beta'/);
  assert.match(migration, /owner_feature_flags/);
});

test('confidence is separate immutable self-report evidence bound to the accepted attempt for the learner session', () => {
  assert.match(migration, /study_answer_confidence_events/);
  assert.match(migration, /attempt_id uuid not null/);
  assert.match(migration, /foreign key \(attempt_id\) references public\.study_attempts\(id\)/);
  assert.match(migration, /where id\s*=\s*p_session[\s\S]*learner_id\s*=\s*p_learner/);
  assert.match(migration, /study_attempts[\s\S]*session_id\s*=\s*p_session/);
  assert.match(migration, /confidence\.recorded/);
  for (const code of ['guess', 'unsure', 'fairly_sure', 'certain']) assert.match(migration, new RegExp(code));
  assert.match(migration, /before update or delete on public\.study_answer_confidence_events/);
  assert.match(migration, /unique\s*\(attempt_id\)/i);
});

test('confidence writes are server gated and cannot grant themselves beta access', () => {
  assert.match(confidenceApi, /learner_feature_allowed_v1/);
  assert.match(confidenceApi, /answer_confidence_capture/);
  assert.match(confidenceApi, /feature_not_enabled/);
  assert.match(confidenceApi, /study_record_answer_confidence_v1/);
  assert.doesNotMatch(migration, /update\s+public\.owner_learner_access_state/i);
  assert.doesNotMatch(migration, /update\s+public\.content_reviewer_grants/i);
});

test('browser asks for confidence before answer and persists only after answer feedback exists', () => {
  assert.match(confidenceUi, /answer_confidence_capture/);
  assert.match(confidenceUi, /data-confidence/);
  for (const code of ['guess', 'unsure', 'fairly_sure', 'certain']) assert.match(confidenceUi, new RegExp(code));
  assert.match(confidenceUi, /medical-answer-form/);
  assert.match(confidenceUi, /answer-feedback/);
  assert.match(confidenceUi, /learner-experiment-api/);
  assert.match(medicalHtml, /answer-confidence-beta\.js/);
  assert.match(publicSurface, /web\/answer-confidence-beta\.js/);
});

test('confidence evidence ships with privacy erasure and composed learner export coverage', () => {
  assert.match(migration, /learner-privacy-scope-v9/);
  assert.match(migration, /study_answer_confidence_events/);
  assert.match(migration, /privacy_erase_learner_data/);
  assert.match(confidenceApi, /path === "\/export"/);
  assert.match(confidenceApi, /study_answer_confidence_events/);
  assert.match(cloudStudy, /answerConfidence/);
  assert.match(cloudStudy, /learner-experiment-api\/export/);
});

test('confidence is observational only and does not change scoring or recommendation policy', () => {
  assert.doesNotMatch(migration, /update\s+public\.study_revision_state/i);
  assert.doesNotMatch(migration, /update\s+public\.study_recommendation_events/i);
  assert.doesNotMatch(migration, /update\s+public\.study_attempts/i);
  assert.doesNotMatch(migration, /mastery/i);
  assert.doesNotMatch(confidenceApi, /study_revision_state|study_recommendation_events|mastery/i);
});
