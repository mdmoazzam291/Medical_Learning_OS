import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile(
  new URL('../supabase/migrations/20260928214728_m06d_personal_correction_overlay.sql', import.meta.url),
  'utf8'
);

test('M06d extends the existing learner annotation layer instead of creating a competing private-note system', () => {
  assert.match(sql, /alter table public\.neural_personal_annotations/);
  assert.match(sql, /annotation_kind text not null default 'note'/);
  assert.match(sql, /correction_target_type/);
  assert.match(sql, /correction_target_id/);
  assert.match(sql, /correction_target_sha256/);
  assert.match(sql, /annotation_kind='correction'/);
  assert.doesNotMatch(sql, /create table[^;]*personal_corrections/i);
});

test('private corrections bind to exact canonical-note or question versions', () => {
  assert.match(sql, /correction_target_type in \('canonical_note','question_version'\)/);
  assert.match(sql, /neural_one_personal_correction_per_target/);
  assert.match(sql, /neural_correction_target_snapshot/);
  assert.match(sql, /status='published'/);
  assert.match(sql, /questionVersionId/);
  assert.match(sql, /link\.value->>'role'='primary'/);
  assert.match(sql, /targetSha256/);
});

test('learner corrections cannot mutate canonical content or acquire canonical authority', () => {
  assert.match(sql, /neural_create_personal_correction/);
  assert.match(sql, /insert into public\.neural_personal_annotations/);
  assert.match(sql, /'canonicalAuthority',false/);
  assert.doesNotMatch(sql, /update public\.study_catalog|update public\.neural_canonical_note_versions/);
});

test('shared error reports are append-only and copy private correction text only with explicit sharing', () => {
  assert.match(sql, /learner_content_issue_reports/);
  assert.match(sql, /learner_content_issue_reports_immutable/);
  assert.match(sql, /p_share_correction/);
  assert.match(sql, /if p_share_correction then/);
  assert.match(sql, /v_suggestion := v_correction\.body_markdown/);
  assert.match(sql, /learner_content_report_share_mismatch/);
  assert.match(sql, /suggested_correction/);
  assert.match(sql, /'canonicalAuthority',false/);
  assert.match(sql, /'learnerModelAuthority',false/);
});

test('new correction/report authority is service-only', () => {
  assert.match(sql, /revoke all on table public\.learner_content_issue_reports[\s\S]*authenticated/);
  assert.match(sql, /grant select on table public\.learner_content_issue_reports to service_role/);
  assert.match(sql, /revoke all on function public\.neural_create_personal_correction[\s\S]*authenticated/);
  assert.match(sql, /grant execute on function public\.neural_create_personal_correction[\s\S]*service_role/);
  assert.match(sql, /revoke all on function public\.neural_report_content_issue[\s\S]*authenticated/);
  assert.match(sql, /grant execute on function public\.neural_report_content_issue[\s\S]*service_role/);
});
