import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [api, admin, adapter] = await Promise.all([
  readFile(new URL('../supabase/functions/review-api/index.ts', import.meta.url), 'utf8'),
  readFile(new URL('../web/admin.js', import.meta.url), 'utf8'),
  readFile(new URL('../src/adapters/cloud-review.js', import.meta.url), 'utf8')
]);

test('M11f authorization API derives authorizer identity server-side', () => {
  assert.match(api, /path === "\/retention-probe\/authorization"/);
  assert.match(api, /await requireAdmin\(\)/);
  assert.match(api, /p_authorizer: reviewerId/);
  const start = api.indexOf('path === "/retention-probe/authorization"');
  const end = api.indexOf('path === "/learner-reports"', start);
  const route = api.slice(start, end);
  assert.doesNotMatch(route, /authorizerId/);
  assert.doesNotMatch(route, /p_authorizer:\s*input/);
});

test('admin shows authorization only after canonical prerequisites', () => {
  assert.match(admin, /awaiting-current-learner-opt-in/);
  assert.match(admin, /retention-probe-activation-authorization/);
  assert.match(admin, /activation-authorization-form/);
  assert.match(admin, /retention-probe-scheduler-kernel-ready/);
  assert.match(admin, /SCHEDULER KERNEL READY · AUTOMATION OFF/);
  assert.match(admin, /There is no cron trigger, no Admin “run scheduler” button and no learner delivery surface yet/);
  assert.match(admin, /activation-revoke-form/);
});

test('authorization client never accepts an authorizer id', () => {
  assert.match(adapter, /retentionProbeAuthorization/);
  const start = adapter.indexOf('retentionProbeAuthorization');
  const end = adapter.indexOf('recordNote', start);
  const method = adapter.slice(start, end);
  assert.doesNotMatch(method, /authorizerId/);
  assert.match(method, /retention-probe-activation-authorization-v1/);
});
