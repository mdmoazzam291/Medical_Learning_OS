import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createCloudOwner } from '../src/adapters/cloud-owner.js';

const migration = await readFile(new URL('../supabase/migrations/20261003111000_owner_admin_console_v1.sql', import.meta.url), 'utf8');
const ownerApi = await readFile(new URL('../supabase/functions/owner-api/index.ts', import.meta.url), 'utf8');
const ownerUi = await readFile(new URL('../web/owner-console.js', import.meta.url), 'utf8');
const adminHtml = await readFile(new URL('../web/admin.html', import.meta.url), 'utf8');

test('owner projections are service-role only and preserve temporary review authority', () => {
  assert.match(migration, /owner_admin_dashboard_v1/);
  assert.match(migration, /owner_admin_learner_search_v1/);
  assert.match(migration, /revoke all on function public\.owner_admin_dashboard_v1\(\) from public, anon, authenticated/);
  assert.match(migration, /grant execute on function public\.owner_admin_dashboard_v1\(\) to service_role/);
  assert.match(migration, /'temporary',true/);
  assert.match(migration, /'expiresAt',expires_at/);
  assert.doesNotMatch(migration, /update\s+public\.content_reviewer_grants/i);
  assert.doesNotMatch(migration, /expires_at\s*=\s*null/i);
});

test('owner API reuses singleton admin authorization and exposes no write methods', () => {
  assert.match(ownerApi, /content_admin_status_v1/);
  assert.match(ownerApi, /content_admin_required/);
  assert.match(ownerApi, /owner_admin_dashboard_v1/);
  assert.match(ownerApi, /owner_admin_learner_search_v1/);
  assert.match(ownerApi, /if \(req\.method !== "GET"\) fail\(405, "method_not_allowed"\)/);
  assert.doesNotMatch(ownerApi, /content_reviewer_grants.*update/i);
});

test('admin page loads owner console only as an admin-page enhancement', () => {
  assert.match(adminHtml, /\/web\/owner-console\.css/);
  assert.match(adminHtml, /\/web\/owner-console\.js/);
  assert.match(ownerUi, /owner\.dashboard\(\)/);
  assert.match(ownerUi, /owner\.searchLearners\(query\)/);
  assert.match(ownerUi, /SINGLE MLOS OWNER/);
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
