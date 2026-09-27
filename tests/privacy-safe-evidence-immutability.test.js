import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile(
  new URL('../supabase/migrations/20260928003000_privacy_safe_evidence_immutability.sql', import.meta.url),
  'utf8'
);

const learnerTables = [
  'exam_run_events',
  'exam_run_receipts',
  'exam_runs',
  'neural_personal_annotations',
  'study_attempts',
  'study_bookmarks',
  'study_memory_judgments',
  'study_policy_experiment_assignments',
  'study_recommendation_events',
  'study_revision_state',
  'study_schedule_decision_events',
  'study_sessions'
];

test('privacy scope is explicit and fail-closed for future learner tables', () => {
  assert.match(sql, /privacy_learner_scope_status/);
  assert.match(sql, /privacy_scope_requires_update/);
  assert.match(sql, /unmappedLearnerTables/);
  for (const table of learnerTables) {
    assert.match(sql, new RegExp("\\('" + table + "'\\)"));
  }
});

test('durable erasure receipt contains no learner identifier or learner-derived hash', () => {
  const create = sql.match(
    /create table if not exists public\.learner_privacy_erasure_receipts \([\s\S]*?\n\);/
  )?.[0] || '';
  assert.match(create, /erasure_id uuid primary key/);
  assert.match(create, /rows_deleted integer/);
  assert.doesNotMatch(create, /learner_id|learner_hash|learner_digest|subject_id/i);
});

test('normal evidence ledgers reject update/delete while privacy erasure can delete only in its scoped transaction', () => {
  assert.match(sql, /prevent_learner_evidence_mutation/);
  assert.match(sql, /tg_op = 'DELETE'/);
  assert.match(sql, /mlos\.privacy_erasure/);
  assert.match(sql, /learner_evidence_is_append_only/);
  assert.match(sql, /revoke update, delete on table[\s\S]*study_attempts[\s\S]*from service_role/);
  assert.match(sql, /create or replace function public\.prevent_exam_ledger_mutation/);
  assert.match(sql, /exam_ledger_is_immutable/);
});

test('privacy erasure is service-only and requires explicit learner confirmation', () => {
  assert.match(sql, /privacy_erase_learner_data\([\s\S]*p_confirmation text/);
  assert.match(sql, /privacy_confirmation_mismatch/);
  assert.match(
    sql,
    /revoke all on function public\.privacy_erase_learner_data\([\s\S]*from public, anon, authenticated/
  );
  assert.match(
    sql,
    /grant execute on function public\.privacy_erase_learner_data\([\s\S]*to service_role/
  );
});

test('erasure deletes dependent learner data before attempts and sessions', () => {
  const body = sql.match(
    /create or replace function public\.privacy_erase_learner_data\([\s\S]*?\n\$function\$;/
  )?.[0] || '';
  const memory = body.indexOf('delete from public.study_memory_judgments');
  const schedule = body.indexOf('delete from public.study_schedule_decision_events');
  const recommendation = body.indexOf('delete from public.study_recommendation_events');
  const receipt = body.indexOf('delete from public.exam_run_receipts');
  const event = body.indexOf('delete from public.exam_run_events');
  const run = body.indexOf('delete from public.exam_runs');
  const attempt = body.indexOf('delete from public.study_attempts');
  const session = body.indexOf('delete from public.study_sessions');
  assert.ok(memory >= 0 && schedule >= 0 && recommendation >= 0);
  assert.ok(memory < attempt && schedule < attempt);
  assert.ok(recommendation < session);
  assert.ok(receipt < run && event < run);
  assert.ok(attempt < session);
});

test('privacy bypass is closed before the non-identifying receipt is written', () => {
  const body = sql.match(
    /create or replace function public\.privacy_erase_learner_data\([\s\S]*?\n\$function\$;/
  )?.[0] || '';
  const off = body.indexOf("'off'");
  const receipt = body.indexOf('insert into public.learner_privacy_erasure_receipts');
  assert.ok(off >= 0 && receipt > off);
  assert.match(body, /exception[\s\S]*mlos\.privacy_erasure[\s\S]*'off'/);
});

test('auth user deletion and session revocation are deliberately outside database erasure v1', () => {
  assert.match(sql, /'authUserDeletionIncluded', false/);
  assert.match(sql, /'authSessionRevocationIncluded', false/);
  assert.doesNotMatch(sql, /delete from auth\.users/i);
  assert.doesNotMatch(sql, /delete from auth\.sessions/i);
});


test('erasure rejects a missing reason before mutation', () => {
  assert.match(
    sql,
    /if p_reason_class is null[\s\S]*privacy_reason_invalid/
  );
});


test('erasure receipt table has an explicit service-only read policy', () => {
  assert.match(sql, /create policy learner_privacy_erasure_receipts_service_read/);
  assert.match(sql, /for select[\s\S]*to service_role[\s\S]*using \(true\)/);
  assert.doesNotMatch(sql, /grant select on table public\.learner_privacy_erasure_receipts[\s\S]*to authenticated/);
});
