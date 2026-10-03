import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';

const migrationsUrl = new URL('../supabase/migrations/', import.meta.url);
const migrationNames = await readdir(migrationsUrl);
const migrationName = migrationNames.find(name => /answer_confidence_beta\.sql$/.test(name));
const migration = migrationName
  ? await readFile(new URL(`../supabase/migrations/${migrationName}`, import.meta.url), 'utf8')
  : '';
const [studyApi, cloudStudy, medical] = await Promise.all([
  readFile(new URL('../supabase/functions/study-api/index.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/adapters/cloud-study.js', import.meta.url), 'utf8'),
  readFile(new URL('../web/medical.js', import.meta.url), 'utf8')
]);

test('answer confidence is registered as a beta-only learner feature', () => {
  assert.ok(migrationName, 'answer-confidence migration must exist');
  assert.match(migration, /'answer_confidence_capture'/);
  assert.match(migration, /'beta'/);
  assert.match(migration, /owner_feature_flags/);
});

test('confidence is separate immutable self-report evidence bound to an owned accepted attempt', () => {
  assert.match(migration, /study_answer_confidence_events/);
  assert.match(migration, /attempt_id uuid not null/);
  assert.match(migration, /foreign key \(attempt_id\) references public\.study_attempts\(id\)/);
  assert.match(migration, /where id\s*=\s*p_attempt[\s\S]*learner_id\s*=\s*p_learner/);
  assert.match(migration, /confidence\.recorded/);
  assert.match(migration, /guess/);
  assert.match(migration, /unsure/);
  assert.match(migration, /fairly_sure/);
  assert.match(migration, /certain/);
  assert.match(migration, /before update or delete on public\.study_answer_confidence_events/);
  assert.match(migration, /unique\s*\(attempt_id\)/i);
});

test('confidence writes are server gated and cannot grant themselves beta access', () => {
  assert.match(studyApi, /learner_feature_allowed_v1/);
  assert.match(studyApi, /answer_confidence_capture/);
  assert.match(studyApi, /feature_not_enabled/);
  assert.match(studyApi, /study_record_answer_confidence_v1/);
  assert.doesNotMatch(migration, /update\s+public\.owner_learner_access_state/i);
  assert.doesNotMatch(migration, /update\s+public\.content_reviewer_grants/i);
});

test('browser collects confidence before answer but stores it only after accepted scoring', () => {
  assert.match(cloudStudy, /features\(\)/);
  assert.match(cloudStudy, /answerConfidence/);
  assert.match(medical, /answer_confidence_capture/);
  assert.match(medical, /data-confidence/);
  assert.match(medical, /guess/);
  assert.match(medical, /unsure/);
  assert.match(medical, /fairly_sure/);
  assert.match(medical, /certain/);
  assert.match(medical, /cloud\.answerConfidence/);
});

test('confidence evidence ships with privacy erasure and export coverage', () => {
  assert.match(migration, /learner-privacy-scope-v9/);
  assert.match(migration, /study_answer_confidence_events/);
  assert.match(migration, /privacy_erase_learner_data/);
  assert.match(studyApi, /answerConfidence/);
  assert.match(studyApi, /study_answer_confidence_events/);
});

test('confidence is observational only and does not change scoring or recommendation policy', () => {
  assert.doesNotMatch(migration, /update\s+public\.study_revision_state/i);
  assert.doesNotMatch(migration, /update\s+public\.study_recommendation_events/i);
  assert.doesNotMatch(migration, /update\s+public\.study_attempts/i);
  assert.doesNotMatch(migration, /mastery/i);
});
