import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { publicFileSet } from '../scripts/public-surface.js';

const migration = await readFile(new URL('../supabase/migrations/20260930164500_m11f5_learner_origin_handoff.sql', import.meta.url), 'utf8');
const api = await readFile(new URL('../supabase/functions/retention-probe-api/index.ts', import.meta.url), 'utf8');
const adapter = await readFile(new URL('../src/adapters/cloud-retention-probe.js', import.meta.url), 'utf8');
const page = await readFile(new URL('../web/retention-origin.js', import.meta.url), 'utf8');
const retentionHtml = await readFile(new URL('../web/retention.html', import.meta.url), 'utf8');
const server = await readFile(new URL('../scripts/serve.js', import.meta.url), 'utf8');

test('origin readiness is prospective, target-unseen, and preserves ordinary learning priority', () => {
  assert.match(migration, /study_retention_probe_origin_readiness_v1/);
  assert.match(migration, /authorization_valid_until<=p_now/);
  assert.match(migration, /decision<>'opt_in'/);
  assert.match(migration, /v_a_attempts>0 and v_b_attempts=0/);
  assert.match(migration, /v_b_attempts>0 and v_a_attempts=0/);
  assert.match(migration, /alternate-target-already-seen/);
  assert.match(migration, /greatest\(v_activation\.recorded_at,v_consent\.recorded_at\)/);
  assert.match(migration, /interval '6 days'/);
  assert.match(migration, /interval '8 days'/);
  assert.match(migration, /due-or-mistake-repair-work-takes-priority/);
  assert.match(migration, /open-study-session-takes-priority/);
});

test('explicit origin start creates an ordinary session but never fabricates an attempt', () => {
  assert.match(migration, /study_open_retention_probe_origin_session_v1/);
  assert.match(migration, /public\.study_start_session/);
  assert.match(migration, /pg_catalog\.jsonb_build_array\(v_origin_version\)/);
  assert.match(migration, /'originAttemptRecorded',false/);
  assert.match(migration, /'ordinaryStudySession',true/);
  assert.doesNotMatch(migration, /insert into public\.study_attempts/);
  assert.doesNotMatch(migration, /study_record_attempt\(/);
});

test('origin RPCs remain service-only and do not widen learning authority', () => {
  assert.match(migration, /revoke all on function public\.study_retention_probe_origin_readiness_v1\(uuid,timestamptz\)\s+from public, anon, authenticated/);
  assert.match(migration, /grant execute on function public\.study_retention_probe_origin_readiness_v1\(uuid,timestamptz\)\s+to service_role/);
  assert.match(migration, /revoke all on function public\.study_open_retention_probe_origin_session_v1\(uuid,uuid,timestamptz\)\s+from public, anon, authenticated/);
  assert.match(migration, /'automaticExecutionEnabled',false/);
  assert.match(migration, /'studyNowAuthority',false/);
  assert.match(migration, /'masteryInferenceAuthority',false/);
});

test('Edge API derives learner identity from auth and exposes only readiness + explicit start', () => {
  assert.match(api, /auth\.getUser\(token\)/);
  assert.match(api, /path === "\/origin"/);
  assert.match(api, /study_retention_probe_origin_readiness_v1/);
  assert.match(api, /path === "\/origin\/start"/);
  assert.match(api, /exactFields\(input, \["sessionId"\]\)/);
  assert.match(api, /study_open_retention_probe_origin_session_v1/);
  assert.doesNotMatch(api, /input\.learnerId/);
});

test('browser adapter and setup UI require an explicit click and hand off to ordinary Study', () => {
  assert.match(adapter, /origin\(\) \{ return request\('\/origin'\); \}/);
  assert.match(adapter, /startOrigin\(\{ sessionId \}\)/);
  assert.match(page, /data-action="start-origin"/);
  assert.match(page, /probe\.startOrigin/);
  assert.match(page, /location\.assign\('\/web\/medical\.html\?source=retention-origin'\)/);
  assert.match(page, /Opening this page has not created a session, exposed the delayed target, or recorded an attempt/);
  assert.doesNotMatch(page, /beta-blocker-first-action/);
  assert.doesNotMatch(page, /answerOptionId/);
  assert.match(retentionHtml, /\/web\/retention-origin\.html/);
});

test('preview server exposes only the allowlisted origin setup HTML and module', () => {
  assert.equal(publicFileSet.has('web/retention-origin.html'), true);
  assert.equal(publicFileSet.has('web/retention-origin.js'), true);
  assert.match(server, /if \(!publicFileSet\.has\(path\)\)/);
});
