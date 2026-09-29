import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [api, admin] = await Promise.all([
  readFile(new URL('../supabase/functions/review-api/index.ts', import.meta.url), 'utf8'),
  readFile(new URL('../web/admin.js', import.meta.url), 'utf8')
]);

test('admin transfer-pair queue is backed by canonical activation readiness', () => {
  assert.match(api, /study_retention_probe_activation_readiness_v1/);
  assert.match(api, /admin-transfer-pair-queue-v2/);
  assert.match(api, /admin-retention-research-gate-v1/);
  assert.match(api, /pendingHumanPairReviews/);
  assert.match(api, /human-transfer-pair-validation/);
  assert.match(api, /separate-activation-authorization-not-implemented/);
});

test('research gate remains fail closed and exposes no activation endpoint', () => {
  assert.match(api, /activationControlAvailable:\s*false/);
  assert.match(api, /activationAuthority:\s*false/);
  assert.match(api, /probeSchedulingEnabled:\s*false/);
  assert.doesNotMatch(api, /path === "\/retention-probes\/activate"/);
  assert.doesNotMatch(api, /path === "\/research\/activate"/);
});

test('admin UI promotes human pair validation without fabricating human judgment', () => {
  assert.match(admin, /ACTION REQUIRED · BLOCKING/);
  assert.match(admin, /Human pair validation is the next research gate/);
  assert.match(admin, /direct human inspection of both exact versions/);
  assert.match(admin, /Review the blocking pair/);
  assert.match(admin, /Separate activation authorization remains intentionally absent/);
  assert.match(admin, /No activate button is exposed here/);
  assert.doesNotMatch(admin, />Activate probes</i);
});
