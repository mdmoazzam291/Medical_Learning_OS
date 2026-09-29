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
  assert.match(api, /awaiting-current-learner-opt-in/);
  assert.match(api, /retention-probe-activation-authorization/);
  assert.match(api, /retention-probe-scheduler-kernel-ready/);
});

test('research gate keeps scheduling fail closed while authorization is separately governed', () => {
  assert.match(api, /path === "\/retention-probe\/authorization"/);
  assert.match(api, /await requireAdmin\(\)/);
  assert.match(api, /p_authorizer: reviewerId/);
  assert.match(api, /probeSchedulingEnabled:\s*false/);
  assert.doesNotMatch(api, /path === "\/retention-probe\/schedule"/);
  assert.doesNotMatch(api, /path === "\/retention-probe\/assign"/);
});

test('admin UI promotes human pair validation without fabricating human judgment', () => {
  assert.match(admin, /ACTION REQUIRED · BLOCKING/);
  assert.match(admin, /Human pair validation is the next research gate/);
  assert.match(admin, /direct human inspection of both exact versions/);
  assert.match(admin, /Review the blocking pair/);
  assert.match(admin, /At least one learner must currently opt in before authorization/);
  assert.match(admin, /Issue a bounded feasibility authorization/);
  assert.match(admin, /SCHEDULER KERNEL READY · AUTOMATION OFF/);
  assert.match(admin, /Eligibility can be computed atomically, but nothing is delivered automatically/);
  assert.match(admin, /This creates an immutable authorization record only\. It does not schedule a probe/);
  assert.doesNotMatch(admin, />Activate probes</i);
});


test('admin receives and labels the M11g report as descriptive feasibility evidence', () => {
  assert.match(api, /study_retention_probe_feasibility_report_v1/);
  assert.match(api, /retention_probe_feasibility_report_unavailable/);
  assert.match(api, /feasibilityReport/);
  assert.match(admin, /FEASIBILITY EVIDENCE · DESCRIPTIVE ONLY/);
  assert.match(admin, /Clean accuracy:/);
  assert.match(admin, /not estimable yet/);
  assert.match(admin, /No causal inference/);
  assert.match(admin, /No hypothesis testing/);
  assert.match(admin, /No mastery\/forgetting fitting/);
});
