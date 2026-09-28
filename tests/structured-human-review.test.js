import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [sql, api, adapter, ui] = await Promise.all([
  readFile(new URL('../supabase/migrations/20260928210400_structured_human_review_batch.sql', import.meta.url), 'utf8'),
  readFile(new URL('../supabase/functions/review-api/index.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/adapters/cloud-review.js', import.meta.url), 'utf8'),
  readFile(new URL('../web/review.js', import.meta.url), 'utf8')
]);

test('structured human review supports question and NeuralVault targets without free-text browser notes', () => {
  assert.match(sql,/p_target_type not in \('question_version','neural_note_version'\)/);
  assert.match(sql,/record_content_review\(/);
  assert.match(sql,/record_neural_note_review\(/);
  assert.match(sql,/No free-text note was required/);
  assert.match(sql,/structured-human-review-v1/);
  assert.match(sql,/publicationAuthority',false/);
  assert.doesNotMatch(sql,/publish_verified_content\(|publish_verified_neural_note\(/);
});

test('structured review is atomic, bounded and service-only', () => {
  assert.match(sql,/v_count < 1 or v_count > 500/);
  assert.match(sql,/count\(distinct x\)/);
  assert.match(sql,/revoke all on function public\.record_structured_review_batch[\s\S]*authenticated/);
  assert.match(sql,/grant execute on function public\.record_structured_review_batch[\s\S]*service_role/);
});

test('structured review preserves gate-specific rejection signals', () => {
  assert.match(sql,/needs_medical_correction/);
  assert.match(sql,/reference_support_insufficient/);
  assert.match(sql,/rights_or_provenance_problem/);
  assert.match(sql,/structured_review_reason_decision_mismatch/);
});

test('API derives reviewer identity from JWT and accepts no browser reviewer ID or free-text notes', () => {
  assert.match(api,/path === "\/structured-review-batch"/);
  assert.match(api,/p_reviewer: reviewerId/);
  assert.doesNotMatch(api,/p_reviewer:\s*input\./);
  const routeStart=api.indexOf('path === "/structured-review-batch"');
  const routeEnd=api.indexOf('path === "/full-question-review"',routeStart);
  const route=api.slice(routeStart,routeEnd);
  assert.doesNotMatch(route,/notes/);
  assert.match(route,/structured_review_attestation_required/);
});

test('browser exposes quick, selected and super actions with explicit master attestation', () => {
  assert.match(ui,/ZERO-TYPING REVIEW/);
  assert.match(ui,/MASTER REVIEW/);
  assert.match(ui,/Approve selected/);
  assert.match(ui,/Reject selected/);
  assert.match(ui,/Super approve \$\{escape\(superApproveIds\.length\)\} preflight-clean/);
  assert.match(ui,/Super reject all \$\{escape\(reviewableIds\.length\)\} reviewable/);
  assert.match(ui,/master-review-attested/);
  assert.match(ui,/globalThis\.confirm/);
  assert.match(ui,/The batch is atomic/);
  assert.doesNotMatch(ui,/class="review-decision-form"/);
});

test('client sends target identity and structured decision only, never reviewer identity', () => {
  assert.match(adapter,/recordStructuredBatch\(\{/);
  const start=adapter.indexOf('recordStructuredBatch({');
  const end=adapter.indexOf('recordMeasurement(',start);
  const section=adapter.slice(start,end);
  assert.doesNotMatch(section,/reviewerId/);
  assert.doesNotMatch(section,/notes/);
  assert.match(section,/targetIds/);
  assert.match(section,/reasonCode/);
  assert.match(section,/attested/);
});


test('super approval is stricter than ordinary human-selected approval', () => {
  assert.match(ui,/function superApprovalEligible\(item\)/);
  assert.match(ui,/state\.targetType !== 'questions'/);
  assert.match(ui,/mediaReview\?\.media/);
  assert.match(ui,/assist\?\.medical\?\.result === 'supported'/);
  assert.match(ui,/assist\?\.medical\?\.uncertainty === 'low'/);
  assert.match(ui,/assist\?\.references\?\.result === 'direct_support'/);
  assert.match(ui,/function superApprovalItems\(\)/);
  assert.match(ui,/At least one selected target is not approvable for this gate/);
});
