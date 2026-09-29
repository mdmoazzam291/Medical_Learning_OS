import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile(
  new URL('../supabase/migrations/20260929235000_m11f2_probe_scheduler_kernel.sql', import.meta.url),
  'utf8'
);

test('probe assignments are immutable learner-scoped service-only evidence', () => {
  assert.match(sql, /create table if not exists public\.study_retention_probe_assignments/);
  assert.match(sql, /learner_id uuid not null references auth\.users\(id\)/);
  assert.match(sql, /study_retention_probe_assignments_append_only/);
  assert.match(sql, /execute function public\.prevent_learner_evidence_mutation\(\)/);
  assert.match(sql, /revoke all on table public\.study_retention_probe_assignments[\s\S]*authenticated/);
  assert.match(sql, /grant select, insert on table public\.study_retention_probe_assignments[\s\S]*service_role/);
});

test('candidate selection is prospective and bound to current consent + authorization', () => {
  assert.match(sql, /study_retention_probe_scheduler_candidates_v1/);
  assert.match(sql, /decision='authorize'/);
  assert.match(sql, /authorization_valid_until > p_now/);
  assert.match(sql, /decision='opt_in'/);
  assert.match(sql, /consent_recorded_at <= o\.origin_attempted_at/);
  assert.match(sql, /authorization_recorded_at <= o\.origin_attempted_at/);
});

test('candidate selection enforces preregistered window and contamination rules', () => {
  assert.match(sql, /windowStartDays/);
  assert.match(sql, /windowEndDays/);
  assert.match(sql, /p_now >= o\.origin_attempted_at/);
  assert.match(sql, /p_now <= o\.origin_attempted_at/);
  assert.match(sql, /target\.event->>'questionVersionId'=o\.target_question_version_id/);
  assert.match(sql, /contamination\.event->>'conceptId'=o\.concept_id/);
  assert.match(sql, /same-concept-contamination-observed/);
});

test('probe work cannot displace due, mistake-repair or open Study Now work', () => {
  assert.match(sql, /r\.due_at <= p_now/);
  assert.match(sql, /r\.latest_correct=false/);
  assert.match(sql, /s\.closed=false/);
  assert.match(sql, /due-or-mistake-repair-work-takes-priority/);
  assert.match(sql, /open-study-session-takes-priority/);
});

test('scheduler enforces protocol and authorization caps plus rolling learner burden', () => {
  assert.match(sql, /protocol_max_total/);
  assert.match(sql, /authorization_max_total/);
  assert.match(sql, /scheduled_at > p_now - interval '7 days'/);
  assert.match(sql, /maxStudyWindowDaysFromFirstAssignment/);
});

test('scheduler kernel has no automatic execution or learner delivery authority', () => {
  assert.match(sql, /manualServiceTickAvailable',true/);
  assert.match(sql, /automaticExecutionEnabled',false/);
  assert.match(sql, /learnerDeliveryEnabled',false/);
  assert.match(sql, /studyNowAuthority',false/);
  assert.match(sql, /masteryInferenceAuthority',false/);
  assert.doesNotMatch(sql, /cron\.schedule|pg_cron|http_post|net\.http/);
});

test('delivery readiness re-checks mutable gates immediately before exposure', () => {
  assert.match(sql, /study_retention_probe_delivery_readiness_v1/);
  assert.match(sql, /learner-not-currently-opted-in/);
  assert.match(sql, /activation-authorization-not-current/);
  assert.match(sql, /pair-or-content-no-longer-current/);
  assert.match(sql, /outside-preregistered-delivery-window/);
  assert.match(sql, /target-question-already-attempted/);
  assert.match(sql, /same-concept-contamination-observed/);
});

test('global activation readiness distinguishes kernel from automation and delivery', () => {
  assert.match(sql, /schedulerKernelAvailable/);
  assert.match(sql, /automaticSchedulerExecutionEnabled/);
  assert.match(sql, /learnerDeliveryEnabled/);
  assert.match(sql, /automatic-scheduler-execution-not-enabled/);
  assert.match(sql, /learner-delivery-not-implemented/);
  assert.match(sql, /'canActivate',false/);
});
