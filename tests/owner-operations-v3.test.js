import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(new URL('../supabase/migrations/20261003153000_owner_operations_v3.sql', import.meta.url), 'utf8');
const monitor = await readFile(new URL('../supabase/functions/infrastructure-monitor/index.ts', import.meta.url), 'utf8');
const studyApi = await readFile(new URL('../supabase/functions/study-api/index.ts', import.meta.url), 'utf8');
const reviewApi = await readFile(new URL('../supabase/functions/review-api/index.ts', import.meta.url), 'utf8');
const retentionApi = await readFile(new URL('../supabase/functions/retention-probe-api/index.ts', import.meta.url), 'utf8');
const ownerApi = await readFile(new URL('../supabase/functions/owner-api/index.ts', import.meta.url), 'utf8');
const studyGate = await readFile(new URL('../supabase/functions/study-api/_shared/runtime-access.ts', import.meta.url), 'utf8');
const reviewGate = await readFile(new URL('../supabase/functions/review-api/_shared/runtime-access.ts', import.meta.url), 'utf8');
const retentionGate = await readFile(new URL('../supabase/functions/retention-probe-api/_shared/runtime-access.ts', import.meta.url), 'utf8');
const ownerGate = await readFile(new URL('../supabase/functions/owner-api/_shared/runtime-access.ts', import.meta.url), 'utf8');
const adminHtml = await readFile(new URL('../web/admin.html', import.meta.url), 'utf8');
const ownerV3Ui = await readFile(new URL('../web/owner-v3-console.js', import.meta.url), 'utf8');
const publicSurface = await readFile(new URL('../scripts/public-surface.js', import.meta.url), 'utf8');

test('hard suspension checks live auth session plus current account suspension', () => {
  assert.match(migration, /from auth\.sessions/);
  assert.match(migration, /id=p_session and user_id=p_user/);
  assert.match(migration, /banned_until > now\(\)/);
  assert.match(migration, /'session_inactive'/);
  assert.match(migration, /'account_suspended'/);
  assert.match(migration, /revoke all on function public\.learner_runtime_access_v1\(uuid,uuid\) from public,anon,authenticated/);
  assert.match(migration, /grant execute on function public\.learner_runtime_access_v1\(uuid,uuid\) to service_role/);
});

test('all protected browser APIs enforce runtime access after verified identity', () => {
  for (const [name, source] of Object.entries({ studyApi, reviewApi, retentionApi, ownerApi })) {
    assert.match(source, /auth\.getUser\(token\)/, `${name} verifies the access token first`);
    assert.match(source, /checkRuntimeAccess\(admin, token, /, `${name} checks session and suspension state`);
    assert.match(source, /account_suspended/, `${name} rejects suspended accounts`);
  }
  for (const helper of [studyGate, reviewGate, retentionGate, ownerGate]) {
    assert.match(helper, /session_id/);
    assert.match(helper, /learner_runtime_access_v1/);
    assert.doesNotMatch(helper, /payload\?\.sub/);
  }
});

test('feature entitlements are canonical and separate from review authority', () => {
  assert.match(migration, /owner_feature_flags/);
  assert.match(migration, /audience in \('all','beta','off'\)/);
  assert.match(migration, /owner_learner_access_state/);
  assert.match(migration, /content_admin_account/);
  assert.match(migration, /'retention_origin_handoff'/);
  assert.match(migration, /'all'/);
  assert.match(retentionApi, /learner_feature_allowed_v1/);
  assert.match(retentionApi, /retention_origin_handoff/);
  assert.match(retentionApi, /feature_not_enabled/);
  assert.match(studyApi, /path === "\/features"/);
  assert.doesNotMatch(migration, /update\s+public\.content_reviewer_grants/i);
  assert.doesNotMatch(migration, /expires_at\s*=\s*null/i);
});

test('owner controls feature audience with explicit confirmation and immutable audit', () => {
  assert.match(ownerApi, /path === "\/feature-flags"/);
  assert.match(ownerApi, /SET FEATURE AUDIENCE/);
  assert.match(ownerApi, /owner_admin_set_feature_flag_v1/);
  assert.match(migration, /owner_feature_flag_audit_immutable/);
  assert.match(migration, /before update or delete on public\.owner_feature_flag_audit_events/);
  assert.match(ownerV3Ui, /SET FEATURE AUDIENCE/);
  assert.match(ownerV3Ui, /crypto\.randomUUID\(\)/);
  assert.doesNotMatch(ownerV3Ui, /service_role|sb_secret_/i);
});

test('infrastructure monitor uses encrypted scheduler auth and persistent alert state', () => {
  assert.match(migration, /create extension if not exists pg_cron/);
  assert.match(migration, /create extension if not exists pg_net/);
  assert.match(migration, /vault\.create_secret/);
  assert.match(migration, /mlos_infra_monitor_key/);
  assert.match(migration, /'\*\/15 \* \* \* \*'/);
  assert.match(migration, /owner_infrastructure_alerts/);
  assert.match(migration, /owner_infrastructure_alert_evaluate_v1/);
  assert.match(monitor, /x-mlos-monitor-key/);
  assert.match(monitor, /owner_monitor_cron_authorized_v1/);
  assert.match(monitor, /owner_monitor_record_provider_v1/);
});

test('monitor probes Cloudflare, Render, R2, Supabase, Resend and Sentry honestly', () => {
  assert.match(monitor, /__edge-health/);
  assert.match(monitor, /onrender\.com\/healthz/);
  assert.match(monitor, /fetchJson\(renderHealthUrl, \{\}, 30000\)/);
  assert.match(monitor, /supabase-r2-backup\.yml/);
  assert.match(monitor, /r2-storage-audit\.yml/);
  assert.match(monitor, /supabase-r2-restore-drill\.yml/);
  assert.match(monitor, /owner_admin_access_summary_v1/);
  assert.match(monitor, /api\.resend\.com\/usage/);
  assert.match(monitor, /organizations\/\$\{encodeURIComponent\(org\)\}\/issues/);
  assert.match(monitor, /projects\/\$\{encodeURIComponent\(org\)\}\/\$\{encodeURIComponent\(project\)\}\/stats/);
  assert.match(monitor, /readTelemetryConnected: false/);
  assert.match(monitor, /status: "configured"/);
});

test('owner V3 browser enhancement is production-served and admin-page only', () => {
  assert.match(adminHtml, /\/web\/owner-v3-console\.js/);
  assert.match(publicSurface, /web\/owner-v3-console\.js/);
  assert.match(ownerV3Ui, /FEATURE ENTITLEMENTS/);
  assert.match(ownerV3Ui, /Open infrastructure alerts/);
  assert.match(ownerV3Ui, /functions\/v1\/owner-api/);
  assert.doesNotMatch(ownerV3Ui, /mdmoazzam291@gmail\.com/i);
});
