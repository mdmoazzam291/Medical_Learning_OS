import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile(
  new URL('../supabase/migrations/20260929235900_m11f3_delivery_evidence_kernel.sql', import.meta.url),
  'utf8'
);

test('learning event stream v2 preserves v1 families and adds research evidence families', () => {
  assert.match(sql, /study_learning_event_stream_v2/);
  for (const family of [
    'question.answered',
    'memory.rating',
    'study.recommendation_generated',
    'research.retention_probe_assigned',
    'research.retention_probe_server_served',
    'research.retention_probe_response_bound'
  ]) assert.match(sql, new RegExp(family.replace('.', '\\.')));
});

test('research events retain exact source traceability', () => {
  assert.match(sql, /study_retention_probe_assignments/);
  assert.match(sql, /study_retention_probe_served_events/);
  assert.match(sql, /study_retention_probe_response_bindings/);
  assert.match(sql, /'assignmentId'/);
  assert.match(sql, /'servedEventId'/);
  assert.match(sql, /'attemptId'/);
});

test('event stream v2 is read-only, paginated, service-only and non-inferential', () => {
  const start = sql.indexOf('create or replace function public.study_learning_event_stream_v2');
  const end = sql.indexOf('create or replace function public.study_retention_probe_activation_readiness_v1', start);
  const fn = sql.slice(start, end);
  assert.match(fn, /stable/);
  assert.match(fn, /security invoker/);
  assert.match(fn, /limit p_limit\+1/);
  assert.match(fn, /'nextCursor'/);
  assert.match(fn, /'inferenceAuthority',false/);
  assert.match(fn, /'masteryInferenceEnabled',false/);
  assert.doesNotMatch(fn, /insert into|update public\.|delete from/i);
  assert.match(fn, /to service_role/);
});
