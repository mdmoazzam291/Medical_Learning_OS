import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createCloudOwner } from '../src/adapters/cloud-owner.js';

const v1Migration = await readFile(new URL('../supabase/migrations/20261003111000_owner_admin_console_v1.sql', import.meta.url), 'utf8');
const v2Migration = await readFile(new URL('../supabase/migrations/20261003114500_owner_operations_v2.sql', import.meta.url), 'utf8');
const ownerApi = await readFile(new URL('../supabase/functions/owner-api/index.ts', import.meta.url), 'utf8');
const ownerUi = await readFile(new URL('../web/owner-console.js', import.meta.url), 'utf8');
const adminHtml = await readFile(new URL('../web/admin.html', import.meta.url), 'utf8');


test('owner projections are service-role only and human-review grants stay temporary', () => {
  assert.match(v1Migration, /owner_admin_dashboard_v1/);
  assert.match(v1Migration, /owner_admin_learner_search_v1/);
  assert.match(v1Migration, /'temporary',true/);
  assert.match(v1Migration, /'expiresAt',expires_at/);
  assert.match(v2Migration, /owner_learner_access_state/);
  assert.match(v2Migration, /owner_admin_audit_events/);
  assert.match(v2Migration, /owner_infrastructure_snapshots/);
  assert.match(v2Migration, /grant execute on function public\.owner_admin_apply_beta_access_v1/);
  assert.doesNotMatch(v1Migration + v2Migration, /update\s+public\.content_reviewer_grants/i);
  assert.doesNotMatch(v1Migration + v2Migration, /expires_at\s*=\s*null/i);
});


test('learner administration is reversible, audited and protects the singleton owner', () => {
  assert.match(v2Migration, /if p_actor = p_learner then raise exception 'owner_target_protected'/);
  assert.match(v2Migration, /request_id uuid not null unique/);
  assert.match(v2Migration, /action text not null check \(action in \('grant_beta','revoke_beta','suspend','restore'\)\)/);
  assert.match(v2Migration, /p_action not in \('grant_beta','revoke_beta'\)/);
  assert.match(v2Migration, /owner_admin_record_auth_action_v1/);
  assert.doesNotMatch(v2Migration, /delete from public\.owner_admin_audit_events/i);
  assert.doesNotMatch(v2Migration, /update public\.owner_admin_audit_events/i);
});


test('owner API keeps singleton authorization and requires typed confirmation for writes', () => {
  assert.match(ownerApi, /content_admin_status_v1/);
  assert.match(ownerApi, /content_admin_required/);
  assert.match(ownerApi, /expectedConfirmations/);
  assert.match(ownerApi, /grant_beta: "GRANT BETA"/);
  assert.match(ownerApi, /revoke_beta: "REVOKE BETA"/);
  assert.match(ownerApi, /suspend: "SUSPEND"/);
  assert.match(ownerApi, /restore: "RESTORE"/);
  assert.match(ownerApi, /learnerId === authData\.user\.id/);
  assert.match(ownerApi, /ban_duration: banDuration/);
  assert.match(ownerApi, /let banDuration = "none"/);
  assert.match(ownerApi, /owner_admin_record_auth_action_v1/);
  assert.doesNotMatch(ownerApi, /content_reviewer_grants.*update/i);
});


test('infrastructure dashboard uses evidence-bearing provider signals', () => {
  assert.match(ownerApi, /__edge-health/);
  assert.match(ownerApi, /supabase-r2-backup\.yml/);
  assert.match(ownerApi, /r2-storage-audit\.yml/);
  assert.match(ownerApi, /supabase-r2-restore-drill\.yml/);
  assert.match(ownerApi, /owner_infrastructure_snapshots_v1/);
  assert.match(ownerUi, /Cloudflare edge/);
  assert.match(ownerUi, /R2 backup system/);
  assert.match(ownerUi, /Resend/);
  assert.match(ownerUi, /Sentry/);
  assert.match(ownerUi, /read token not connected/);
});


test('admin page exposes controlled learner management only through the owner enhancement', () => {
  assert.match(adminHtml, /\/web\/owner-console\.css/);
  assert.match(adminHtml, /\/web\/owner-console\.js/);
  assert.match(ownerUi, /owner\.dashboard\(\)/);
  assert.match(ownerUi, /owner\.searchLearners\(query\)/);
  assert.match(ownerUi, /owner\.learnerDetail\(learnerId\)/);
  assert.match(ownerUi, /owner\.learnerAction/);
  assert.match(ownerUi, /GRANT BETA/);
  assert.match(ownerUi, /REVOKE BETA/);
  assert.match(ownerUi, /SUSPEND/);
  assert.match(ownerUi, /RESTORE/);
  assert.match(ownerUi, /Temporary by design/);
  assert.doesNotMatch(ownerUi, /mdmoazzam291@gmail\.com/i);
});


test('owner cloud adapter retries one expired session token and then returns dashboard', async () => {
  let token = 'old-token';
  let refreshes = 0;
  let calls = 0;
  const auth = {
    async getSession(options = {}) {
      if (options.forceRefresh) {
        refreshes += 1;
        token = 'new-token';
      }
      return { accessToken: token };
    }
  };
  const fetchFn = async (_url, options) => {
    calls += 1;
    if (options.headers.Authorization === 'Bearer old-token') {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({ contractId: 'owner-admin-dashboard-v1', owner: { singleton: true } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  const cloudOwner = createCloudOwner({
    projectUrl: 'https://example.supabase.co',
    publishableKey: 'sb_publishable_test',
    auth,
    fetchFn
  });
  const result = await cloudOwner.dashboard();
  assert.equal(result.contractId, 'owner-admin-dashboard-v1');
  assert.equal(refreshes, 1);
  assert.equal(calls, 2);
});


test('owner learner action uses POST and forwards no browser-side privilege credential', async () => {
  const requests = [];
  const auth = { async getSession() { return { accessToken: 'learner-jwt' }; } };
  const fetchFn = async (url, options) => {
    requests.push({ url, options });
    return new Response(JSON.stringify({ contractId: 'owner-admin-action-receipt-v1' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  };
  const cloudOwner = createCloudOwner({
    projectUrl: 'https://example.supabase.co',
    publishableKey: 'sb_publishable_test',
    auth,
    fetchFn
  });
  await cloudOwner.learnerAction({
    learnerId: '00000000-0000-4000-8000-000000000001',
    action: 'restore',
    reason: 'Controlled support action',
    confirmation: 'RESTORE',
    requestId: '00000000-0000-4000-8000-000000000002',
    betaAccessUntil: null,
    suspensionHours: null
  });
  assert.equal(requests.length, 1);
  assert.match(requests[0].url, /\/functions\/v1\/owner-api\/learner-actions$/);
  assert.equal(requests[0].options.method, 'POST');
  assert.equal(requests[0].options.headers.Authorization, 'Bearer learner-jwt');
  assert.doesNotMatch(JSON.stringify(requests[0]), /service_role|sb_secret_/i);
});
