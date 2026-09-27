import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile(
  new URL('../supabase/migrations/20260927232000_canonical_learning_event_stream.sql', import.meta.url),
  'utf8'
);

test('canonical learning event stream is a read-only replay adapter', () => {
  assert.match(sql, /study_learning_event_stream_v1/);
  assert.match(sql, /language plpgsql/);
  assert.match(sql, /stable/);
  assert.match(sql, /security invoker/);
  assert.doesNotMatch(sql, /insert into|update public\.|delete from/i);
});

test('stream includes only explicitly mapped v1 families', () => {
  assert.match(sql, /'question\.answered'/);
  assert.match(sql, /'memory\.rating'/);
  assert.match(sql, /'study\.recommendation_generated'/);
  assert.match(sql, /'observation'/);
  assert.match(sql, /'self_report'/);
  assert.match(sql, /'policy_decision'/);
  assert.doesNotMatch(sql, /exam_run_events/);
  assert.doesNotMatch(sql, /study_schedule_decision_events/);
  assert.doesNotMatch(sql, /neural_personal_annotations/);
});

test('stream preserves exact source traceability and deterministic pagination', () => {
  assert.match(sql, /'study_attempts'::text as source_table/);
  assert.match(sql, /'study_memory_judgments'::text as source_table/);
  assert.match(sql, /'study_recommendation_events'::text as source_table/);
  assert.match(sql, /order by recorded_at, event_key/);
  assert.match(sql, /learning_event_stream_cursor_invalid/);
  assert.match(sql, /limit p_limit \+ 1/);
  assert.match(sql, /'nextCursor'/);
});

test('stream never claims Digital Twin inference authority', () => {
  assert.match(sql, /'inferenceAuthority', false/);
  assert.match(sql, /'masteryInferenceEnabled', false/);
  assert.doesNotMatch(sql, /masteryScore|knowledgeScore|forgettingScore|abilityScore/i);
});

test('canonical stream stays service-only', () => {
  assert.match(
    sql,
    /revoke all on function public\.study_learning_event_stream_v1\([\s\S]*from public, anon, authenticated/
  );
  assert.match(
    sql,
    /grant execute on function public\.study_learning_event_stream_v1\([\s\S]*to service_role/
  );
});
