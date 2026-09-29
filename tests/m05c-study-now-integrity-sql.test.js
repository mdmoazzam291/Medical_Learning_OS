import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile(
  new URL('../supabase/migrations/20260930004500_m05c_study_now_integrity.sql', import.meta.url),
  'utf8'
);

test('Study Now transport evidence is append-only, coarse and service-only', () => {
  assert.match(sql, /study_recommendation_transport_events/);
  assert.match(sql, /hosted-browser-cors/);
  assert.match(sql, /local-browser-cors/);
  assert.match(sql, /authenticated-api/);
  assert.match(sql, /study_recommendation_transport_events_append_only/);
  assert.match(sql, /prevent_learner_evidence_mutation/);
  assert.match(sql, /revoke all on table public\.study_recommendation_transport_events[\s\S]*authenticated/);
  assert.match(sql, /grant select, insert on table public\.study_recommendation_transport_events[\s\S]*service_role/);
  const tableStart = sql.indexOf('create table if not exists public.study_recommendation_transport_events');
  const tableEnd = sql.indexOf(');', tableStart) + 2;
  const tableDefinition = sql.slice(tableStart, tableEnd);
  assert.doesNotMatch(tableDefinition, /\buser_agent\b|\bip_address\b|\bdevice_fingerprint\b|\bexact_origin\b/i);
});

test('transport receipt derives recommendation membership from canonical session and attempt evidence', () => {
  assert.match(sql, /study_record_recommendation_transport_event_v1/);
  assert.match(sql, /from public\.study_recommendation_events/);
  assert.match(sql, /from public\.study_attempts/);
  assert.match(sql, /study_now_transport_attempt_not_recommended/);
  assert.match(sql, /unique \(attempt_id\)/);
});

test('M05c completion requires closed recommendation, all selected answers and authoritative reschedule evidence', () => {
  assert.match(sql, /study_now_completion_integrity_v1/);
  assert.match(sql, /session_closed/);
  assert.match(sql, /attempted_count=selected_count/);
  assert.match(sql, /authoritative_schedule_count=selected_count/);
  assert.match(sql, /authoritative-reschedule-evidence-missing/);
});

test('hosted M05c gate requires at least one server-derived hosted-browser answer', () => {
  assert.match(sql, /hosted_browser_answer_count>0/);
  assert.match(sql, /no-hosted-browser-answer-evidence/);
  assert.match(sql, /hostedBrowserGateSatisfied/);
  assert.match(sql, /hostedM05cGateSatisfied/);
});

test('memory rating remains optional for M05c completion', () => {
  assert.match(sql, /memoryRatingRequiredForCompletion',false/);
  assert.match(sql, /memoryRatingOptional',true/);
  assert.doesNotMatch(sql, /memory_rating_count=selected_count/);
});

test('integrity contract grants no learning-policy authority', () => {
  assert.match(sql, /acceptance-integrity-not-learning-quality/);
  assert.match(sql, /masteryInferenceAuthority',false/);
  assert.match(sql, /schedulerPolicyPromotionAuthority',false/);
});
