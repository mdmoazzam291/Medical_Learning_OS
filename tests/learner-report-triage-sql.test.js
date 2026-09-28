import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile(
  new URL('../supabase/migrations/20260928221939_m02d_learner_report_triage.sql', import.meta.url),
  'utf8'
);

test('learner content issue triage is immutable reviewer evidence, not canonical mutation', () => {
  assert.match(sql, /learner_content_issue_triage_events/);
  assert.match(sql, /decision in \('no_canonical_issue','correction_required'\)/);
  assert.match(sql, /learner_content_issue_triage_append_only/);
  assert.match(sql, /'canonicalMutation',false/);
  assert.match(sql, /'publicationAuthority',false/);
  assert.match(sql, /'learnerModelAuthority',false/);
  assert.doesNotMatch(sql, /update public\.study_catalog|update public\.neural_canonical_note_versions/);
});

test('triage groups only one exact target snapshot and blocks reviewer self-triage', () => {
  assert.match(sql, /r\.target_type is distinct from v_target_type/);
  assert.match(sql, /r\.target_id is distinct from v_target_id/);
  assert.match(sql, /r\.target_sha256 is distinct from v_target_sha256/);
  assert.match(sql, /content_issue_triage_target_mismatch/);
  assert.match(sql, /r\.learner_id=p_reviewer/);
  assert.match(sql, /content_issue_triage_self_review_blocked/);
});

test('triage requires an active matching reviewer grant and explicit attestation', () => {
  assert.match(sql, /has_active_reviewer_grant\(p_reviewer,p_review_kind\)/);
  assert.match(sql, /learner-content-issue-triage-attestation-v1/);
  assert.match(sql, /content_issue_triage_attestation_required/);
  assert.match(sql, /content_issue_triage_reason_mismatch/);
});

test('triage mutation is service-only and direct service inserts remain blocked', () => {
  assert.match(sql, /revoke all on table public\.learner_content_issue_triage_events[\s\S]*authenticated/);
  assert.match(sql, /grant select on table public\.learner_content_issue_triage_events[\s\S]*service_role/);
  assert.doesNotMatch(sql, /grant insert on table public\.learner_content_issue_triage_events/);
  assert.match(sql, /revoke all on function public\.triage_learner_content_issue_reports[\s\S]*authenticated/);
  assert.match(sql, /grant execute on function public\.triage_learner_content_issue_reports[\s\S]*service_role/);
});

test('privacy erasure can cascade triage evidence only inside the existing scoped exception', () => {
  assert.match(sql, /references public\.learner_content_issue_reports\(id\) on delete cascade/);
  assert.match(sql, /tg_op='DELETE'/);
  assert.match(sql, /mlos\.privacy_erasure/);
  assert.match(sql, /learner-erasure-v1/);
});
