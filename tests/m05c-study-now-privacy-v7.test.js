import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile(
  new URL('../supabase/migrations/20260930004600_m05c_privacy_scope_v7.sql', import.meta.url),
  'utf8'
);

test('privacy scope v7 includes Study Now transport evidence', () => {
  assert.match(sql, /alter column scope_version set default 7/);
  assert.match(sql, /learner-privacy-scope-v7/);
  assert.match(sql, /\('study_recommendation_transport_events'\)/);
  assert.match(sql, /'scopeVersion',7/);
});

test('privacy erasure deletes transport evidence before recommendation and attempt parents', () => {
  const transport = sql.indexOf('delete from public.study_recommendation_transport_events');
  const recommendation = sql.indexOf('delete from public.study_recommendation_events');
  const attempt = sql.indexOf('delete from public.study_attempts');
  assert.ok(transport >= 0);
  assert.ok(recommendation > transport);
  assert.ok(attempt > transport);
  assert.match(sql, /jsonb_build_object\('study_recommendation_transport_events',v_count\)/);
  assert.match(sql, /select 1 from public\.study_recommendation_transport_events where learner_id=p_learner/);
});
