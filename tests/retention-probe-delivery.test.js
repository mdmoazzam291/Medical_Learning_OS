import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const deliverySql = await readFile(new URL('../supabase/migrations/20260930090000_m11f4_learner_delivery_render.sql', import.meta.url), 'utf8');
const privacySql = await readFile(new URL('../supabase/migrations/20260930090100_m11f4_privacy_scope_v8.sql', import.meta.url), 'utf8');
const answerSql = await readFile(new URL('../supabase/migrations/20260930090200_m11f4_probe_answer_rpc.sql', import.meta.url), 'utf8');
const hardeningSql = await readFile(new URL('../supabase/migrations/20260930090300_m11f4_definer_search_path.sql', import.meta.url), 'utf8');
const api = await readFile(new URL('../supabase/functions/retention-probe-api/index.ts', import.meta.url), 'utf8');
const adapter = await readFile(new URL('../src/adapters/cloud-retention-probe.js', import.meta.url), 'utf8');
const ui = await readFile(new URL('../web/retention.js', import.meta.url), 'utf8');
const server = await readFile(new URL('../scripts/serve.js', import.meta.url), 'utf8');


test('M11f4 client evidence is append-only, service-only and semantics stay conservative', () => {
  assert.match(deliverySql, /create table if not exists public\.study_retention_probe_client_events/);
  assert.match(deliverySql, /alter table public\.study_retention_probe_client_events enable row level security/);
  assert.match(deliverySql, /revoke all on table public\.study_retention_probe_client_events\s+from public,anon,authenticated,service_role/);
  assert.match(deliverySql, /grant select,insert on table public\.study_retention_probe_client_events\s+to service_role/);
  assert.match(deliverySql, /study_retention_probe_client_events_append_only/);
  assert.match(deliverySql, /'browser-rendered-not-confirmed-viewed'/);
  assert.match(deliverySql, /'learnerViewedConfirmed',false/);
  assert.match(deliverySql, /'automaticExecutionEnabled',false/);
  assert.match(deliverySql, /'studyNowAuthority',false/);
  assert.match(deliverySql, /'masteryInferenceAuthority',false/);
});


test('ordinary study cannot resume a dedicated probe session', () => {
  assert.match(deliverySql, /study_open_ordinary_session_id_v1/);
  assert.match(deliverySql, /e\.event_type='session_opened'/);
  assert.match(deliverySql, /create or replace function public\.study_start_session/);
  assert.match(deliverySql, /select public\.study_open_ordinary_session_id_v1\(p_learner\)/);
  assert.match(deliverySql, /ordinary_study_session_takes_priority/);
});


test('available inbox reveals no question content before explicit start', () => {
  const available = deliverySql.slice(deliverySql.indexOf("'state','available'"));
  const returnBlock = available.slice(0, available.indexOf('end;'));
  assert.doesNotMatch(returnBlock, /learnerQuestion/);
  assert.doesNotMatch(returnBlock, /targetQuestionVersionId/);
  assert.match(returnBlock, /'assignmentId'/);
});


test('probe answer uses canonical attempt ledger and requires browser render first', () => {
  assert.match(answerSql, /retention_probe_browser_render_required/);
  assert.match(answerSql, /public\.study_record_attempt\(/);
  assert.match(answerSql, /public\.study_bind_retention_probe_response_v1\(/);
  assert.match(answerSql, /public\.study_rebuild_revision_state\(/);
  assert.match(answerSql, /public\.study_record_schedule_decision\(/);
  assert.match(answerSql, /public\.study_advance_session\(/);
  assert.doesNotMatch(answerSql, /study_recommendation_transport_events/);
  assert.match(answerSql, /'studyNowAuthority',false/);
  assert.match(answerSql, /'masteryInferenceAuthority',false/);
  assert.match(answerSql, /'causalInferenceAuthority',false/);
});


test('M11f4 security definer functions end on an empty search path', () => {
  for (const signature of [
    'study_open_retention_probe_session_v1\\(uuid,uuid,uuid,text\\)',
    'study_record_retention_probe_rendered_v1\\(uuid,uuid,text,text\\)',
    'study_answer_retention_probe_v1\\(uuid,uuid,text,text\\)'
  ]) {
    assert.match(hardeningSql, new RegExp(`alter function public\\.${signature}\\s+set search_path=''`));
  }
});


test('privacy scope advances and explicitly erases client evidence before its parents', () => {
  assert.match(privacySql, /scope_version set default 8/);
  assert.match(privacySql, /'learner-privacy-scope-v8'/);
  assert.match(privacySql, /\('study_retention_probe_client_events'\)/);
  const clientDelete = privacySql.indexOf('delete from public.study_retention_probe_client_events');
  const servedDelete = privacySql.indexOf('delete from public.study_retention_probe_served_events');
  const sessionDelete = privacySql.indexOf('delete from public.study_sessions');
  assert.ok(clientDelete > 0 && clientDelete < servedDelete && clientDelete < sessionDelete);
  assert.match(privacySql, /'scopeVersion',8/);
});


test('retention Edge API derives learner identity from verified Auth and exposes no scheduler tick', () => {
  assert.match(api, /auth\.getUser\(token\)/);
  assert.match(api, /const learnerId = authData\.user\.id/);
  assert.match(api, /study_retention_probe_learner_inbox_v1/);
  assert.match(api, /study_record_retention_probe_served_v1/);
  assert.match(api, /study_open_retention_probe_session_v1/);
  assert.match(api, /study_record_retention_probe_rendered_v1/);
  assert.match(api, /study_answer_retention_probe_v1/);
  assert.doesNotMatch(api, /study_retention_probe_scheduler_tick_v1/);
  assert.doesNotMatch(api, /p_learner:\s*input/);
});


test('learner transport starts only on explicit action, recovers a served session, and records render separately', () => {
  assert.match(adapter, /functions\/v1\/retention-probe-api/);
  assert.match(adapter, /inbox\(\) \{ return request\('\/inbox'\); \}/);
  assert.match(adapter, /start\(\{ assignmentId, requestId \}\)/);
  assert.match(adapter, /rendered\(\{ servedEventId, learnerQuestionSha256 \}\)/);
  assert.match(adapter, /answer\(\{ servedEventId, requestId, optionId \}\)/);
  assert.match(ui, /data-action="start"/);
  assert.match(ui, /async function recoverServedSession\(inbox\)/);
  assert.match(ui, /requestId:`retention-resume:\$\{inbox\.servedEventId\}`/);
  assert.match(ui, /inbox = await recoverServedSession\(inbox\)/);
  assert.match(ui, /requestAnimationFrame\(\(\) => acknowledgeRender\(\)\)/);
  assert.match(ui, /Browser render recorded\. This does not claim that you viewed or remembered the question/);
  const bootstrapTail = ui.slice(ui.lastIndexOf('\nrender();')).trim();
  assert.equal(bootstrapTail, 'render();\nloadInbox();');
  assert.doesNotMatch(bootstrapTail, /startProbe\(\)/);
  assert.match(server, /'web\/retention\.html'/);
  assert.match(server, /'src\/adapters\/cloud-retention-probe\.js'/);
});
