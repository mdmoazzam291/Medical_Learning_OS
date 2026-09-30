import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile(new URL('../supabase/migrations/20260930103500_m11f4_refresh_evidence_readiness.sql', import.meta.url), 'utf8');

test('M11f4 readiness reports implemented learner transport and render acknowledgement', () => {
  assert.match(sql, /'learnerRouteEnabled',true/);
  assert.match(sql, /'renderAcknowledgementImplemented',true/);
  assert.match(sql, /event_type='session_opened'/);
  assert.match(sql, /event_type='browser_rendered'/);
  assert.match(sql, /'clientSessionOpenedCount'/);
  assert.match(sql, /'browserRenderedCount'/);
});

test('render evidence stays semantically weaker than learner viewing', () => {
  assert.match(sql, /'serverServedMeansLearnerSeen',false/);
  assert.match(sql, /'browserRenderedMeansLearnerViewed',false/);
  assert.match(sql, /'servedWithoutRenderCount'/);
  assert.match(sql, /'servedWithoutResponseCount'/);
});

test('evidence readiness does not activate scheduling or learning authority', () => {
  assert.match(sql, /'automaticExecutionEnabled',false/);
  assert.match(sql, /'studyNowAuthority',false/);
  assert.match(sql, /'masteryInferenceAuthority',false/);
  assert.match(sql, /revoke all on function public\.study_retention_probe_evidence_readiness_v1\(\)\s+from public, anon, authenticated/);
  assert.doesNotMatch(sql, /insert into/);
  assert.doesNotMatch(sql, /update public\./);
  assert.doesNotMatch(sql, /delete from/);
});
