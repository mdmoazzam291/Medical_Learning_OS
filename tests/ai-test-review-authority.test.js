import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(
  new URL('../supabase/migrations/20260927213048_ai_test_review_authority.sql', import.meta.url),
  'utf8'
);
const policy = JSON.parse(await readFile(
  new URL('../data/autonomous-content-policy.json', import.meta.url),
  'utf8'
));

test('AI review evidence is separate from human review and production publication', () => {
  assert.match(migration, /content_ai_test_review_events/);
  assert.match(migration, /content_ai_test_source_rights/);
  assert.match(migration, /record_ai_test_review/);
  assert.match(migration, /exam_mock_test_readiness/);
  assert.match(migration, /exam_assemble_test_mock/);
  assert.match(migration, /productionPublicationRequiresHumanReview/);
  assert.doesNotMatch(migration, /insert into public\.content_review_events/i);
  assert.doesNotMatch(migration, /update public\.study_catalog[\s\S]{0,500}status['"]?,\s*['"]published/i);
});

test('browser roles cannot exercise AI-test review authority', () => {
  assert.match(migration, /revoke all on function public\.record_ai_test_review[^;]+from public, anon, authenticated/);
  assert.match(migration, /revoke all on function public\.record_ai_test_source_rights[^;]+from public, anon, authenticated/);
  assert.match(migration, /for all to anon, authenticated\s+using \(false\) with check \(false\)/);
  assert.match(migration, /ai_test_review_evidence_immutable/);
});

test('exam-value policy targets NEET-PG and INI-CET without inventing frequency', () => {
  assert.deepEqual(policy.targetExams, ['neet-pg', 'ini-cet']);
  assert.equal(policy.batchSizing.minimumQuestions, 25);
  assert.equal(policy.internalTesting.stopWhenReady, true);
  assert.equal(policy.aiReviewAuthority.scope, 'internal_testing_only');
  assert.equal(policy.aiReviewAuthority.productionPublicationAuthority, false);
  assert.equal(policy.aiReviewAuthority.mayRepresentAiReviewAsHuman, false);
  assert.match(
    policy.conceptSelectionOrder.find(item => item.factor === 'verified_exam_evidence').rule,
    /Never infer or invent exam frequency/
  );
});
