import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [sql, api, adapter, ui, assist] = await Promise.all([
  readFile(new URL('../supabase/migrations/20260928205518_full_question_review_bundle.sql', import.meta.url), 'utf8'),
  readFile(new URL('../supabase/functions/review-api/index.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/adapters/cloud-review.js', import.meta.url), 'utf8'),
  readFile(new URL('../web/review.js', import.meta.url), 'utf8'),
  readFile(new URL('../data/content-review-assist.json', import.meta.url), 'utf8')
]);

test('full review bundle writes three existing gate receipts atomically and has no publication authority', () => {
  assert.match(sql, /record_full_question_review_bundle/);
  assert.match(sql, /array\['medical','references','rights'\]/);
  assert.match(sql, /record_content_review\(/);
  assert.match(sql, /'approved'/);
  assert.match(sql, /'publicationAuthority',false/);
  assert.doesNotMatch(sql, /publish_verified_content\(/);
});

test('full review bundle requires all active grants, prior-zero review state and explicit attestation', () => {
  assert.match(sql, /has_active_reviewer_grant\(p_reviewer,'medical'\)/);
  assert.match(sql, /has_active_reviewer_grant\(p_reviewer,'references'\)/);
  assert.match(sql, /has_active_reviewer_grant\(p_reviewer,'rights'\)/);
  assert.match(sql, /full_review_requires_unreviewed_version/);
  assert.match(sql, /full-question-review-attestation-v1/);
  assert.match(sql, /p_attested is distinct from true/);
});

test('full review bundle remains service-only', () => {
  assert.match(sql, /revoke all on function public\.record_full_question_review_bundle[\s\S]*authenticated/);
  assert.match(sql, /grant execute on function public\.record_full_question_review_bundle[\s\S]*service_role/);
});

test('review API derives reviewer identity from JWT for full bundle', () => {
  assert.match(api, /path === "\/full-question-review"/);
  assert.match(api, /p_reviewer: reviewerId/);
  assert.doesNotMatch(api, /p_reviewer:\s*input\./);
  assert.match(api, /full_review_attestation_required/);
  assert.match(api, /record_full_question_review_bundle/);
});

test('client adapter sends no reviewer identity for full bundle', () => {
  assert.match(adapter, /recordFullQuestionReview\(\{/);
  const start = adapter.indexOf('recordFullQuestionReview({');
  const end = adapter.indexOf('recordMeasurement(', start);
  const section = adapter.slice(start, end);
  assert.doesNotMatch(section, /reviewerId/);
  assert.match(section, /full-question-review/);
  assert.match(section, /attestationVersion/);
});

test('browser requires explicit human attestation and preserves gate-specific reject path', () => {
  assert.match(ui, /FULL REVIEW BUNDLE/);
  assert.match(ui, /Human decision required/);
  assert.match(ui, /I independently inspected this exact question/);
  assert.match(ui, /Approve all 3 gates/);
  assert.match(ui, /If any gate should fail, use the gate-specific Reject button instead/);
  assert.match(ui, /review\.recordFullQuestionReview/);
  assert.match(ui, /quick-structured-review/);
  assert.doesNotMatch(ui, /name="medicalNotes"|name="referencesNotes"|name="rightsNotes"/);
});

test('full review shortcut is hidden inside measured M02c References arms', () => {
  assert.match(ui, /inMeasuredReferencesArm/);
  assert.match(ui, /\['claim_first', 'standard'\]\.includes\(state\.referencesExperimentArm\)/);
  assert.match(ui, /if \(!questionVersionId \|\| reviews\.length \|\| !allGrants \|\| !rightsReady \|\| inMeasuredReferencesArm\) return ''/);
});

test('connected-learning anaphylaxis candidate has complete non-authoritative preflight drafts', () => {
  const packet = JSON.parse(assist);
  const item = packet.questions.find(q => q.questionVersionId === 'emergency:anaphylaxis:no-rash-first-action@1');
  assert.ok(item);
  assert.equal(item.medical.result, 'supported');
  assert.equal(item.references.result, 'direct_support');
  assert.ok(item.medical.draftNote);
  assert.ok(item.references.draftNote);
  assert.ok(item.rights.draftNote);
});
