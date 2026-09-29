import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [app, account, admin, serve, medical] = await Promise.all([
  readFile(new URL('../web/app.js', import.meta.url), 'utf8'),
  readFile(new URL('../web/account.js', import.meta.url), 'utf8'),
  readFile(new URL('../web/admin.js', import.meta.url), 'utf8'),
  readFile(new URL('../scripts/serve.js', import.meta.url), 'utf8'),
  readFile(new URL('../web/medical.js', import.meta.url), 'utf8')
]);

test('root is the authenticated beta product, not the local demo', () => {
  assert.doesNotMatch(app, /demo-study|local-store|Demo QBank|LOCAL PREVIEW|Start demo/);
  assert.match(app, /PREPARATION COMMAND CENTER/);
  assert.match(app, /STUDY NOW/);
  assert.match(app, /\/web\/medical\.html/);
  assert.match(app, /\/web\/exam\.html/);
  assert.match(app, /\/web\/vault\.html/);
  assert.match(app, /\/web\/account\.html/);
});

test('admin navigation is conditional and learner account has no review controls', () => {
  assert.match(app, /if \(state\.isAdmin\) items\.push\(\['\/web\/admin\.html', 'Admin'\]\)/);
  assert.match(account, /state\.isAdmin/);
  assert.match(account, /Open Admin Console/);
  assert.doesNotMatch(account, /Open review workspace/);
  assert.match(admin, /me\?\.isAdmin !== true/);
  assert.match(admin, /Admin access only/);
});

test('admin console owns content and M11c pair validation UI', () => {
  assert.match(admin, /Content Admin Console|SINGLE CONTENT ADMIN/);
  assert.match(admin, /validateTransferPair/);
  assert.match(admin, /transfer-pair-human-validation-v1|human research validation/);
  assert.match(admin, /Validation does not activate probes/);
});

test('legacy demo runtime is not publicly served', () => {
  assert.match(serve, /web\/admin\.html/);
  assert.match(serve, /web\/admin\.js/);
  assert.doesNotMatch(serve, /src\/domain\/demo-study\.js/);
  assert.doesNotMatch(serve, /src\/adapters\/local-store\.js/);
});

test('Study Now deep links are consumed once and scrubbed from the URL', () => {
  assert.match(medical, /requestedStudyNowMinutes/);
  assert.match(medical, /searchParams\.delete\('studyNow'\)/);
  assert.match(medical, /await startStudyNow\(minutes\)/);
});


test('learner account exposes explicit optional retention opt-in without activation authority', () => {
  assert.match(account, /OPTIONAL LEARNING-MEASUREMENT PILOT/);
  assert.match(account, /retention-optin-form/);
  assert.match(account, /Opt in to retention feasibility/);
  assert.match(account, /Withdraw from future retention probes/);
  assert.match(account, /Opt-in does not activate scheduling/);
  assert.match(account, /cloud\.setRetentionProbeConsent/);
  assert.match(account, /decision: 'opt_in'/);
  assert.match(account, /decision: 'withdraw'/);
  assert.doesNotMatch(account, /learnerId\s*:/);
});
