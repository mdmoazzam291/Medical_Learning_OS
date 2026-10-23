import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const api = readFileSync(new URL('../supabase/functions/study-api/index.ts', import.meta.url), 'utf8');
const account = readFileSync(new URL('../web/account.js', import.meta.url), 'utf8');
const route = api.slice(api.indexOf('    if (req.method === "GET" && path === "/retention-probe/consent")'), api.indexOf('    if (req.method === "POST" && path === "/retention-probe/consent")'));
const inactive = {
  contractId: 'retention-probe-learner-consent-v1', availability: 'inactive',
  reason: 'no_preregistered_protocol', protocol: null, decision: 'not_decided',
  optedIn: false, lastDecisionAt: null, consentEventId: null,
  activationAuthority: false, probeSchedulingEnabled: false, masteryInferenceAuthority: false
};
const registered = {
  contractId: 'retention-probe-learner-consent-v1',
  protocol: { protocolId: 'synthetic', protocolVersion: 1, protocolSha256: 'a'.repeat(64),
    preregisteredAt: '2026-10-01T00:00:00Z', targetDays: 7, windowStartDays: 6,
    windowEndDays: 8, maxProbeAssignmentsPerLearnerPer7Days: 1,
    maxTotalAssignments: 20, mayDisplaceDueOrMistakeRepairWork: false },
  decision: 'not_decided', optedIn: false, lastDecisionAt: null, consentEventId: null,
  activationAuthority: false, probeSchedulingEnabled: false, masteryInferenceAuthority: false
};

async function readConsent({ data = null, error = null, query = '' } = {}) {
  const calls = [];
  const context = vm.createContext({
    req: new Request('https://example.invalid/retention-probe/consent' + query),
    path: '/retention-probe/consent', url: new URL('https://example.invalid/' + query),
    learnerId: 'synthetic-learner',
    admin: { async rpc(name, args) { calls.push({ name, args }); return { data, error }; } },
    fail(status, code) { throw Object.assign(new Error(code), { status }); },
    response(_req, status, body) { return Response.json(body, { status }); }
  });
  try {
    const response = await vm.runInContext('(async () => {' + route + '})()', context);
    return { status: response.status, body: await response.json(), calls };
  } catch (error) { return { status: error.status, body: { error: error.message }, calls }; }
}

test('missing optional protocol returns an inactive read without enrolling or scheduling', async () => {
  const result = await readConsent();
  assert.equal(result.status, 200);
  assert.deepEqual(result.body, inactive);
  assert.equal(result.calls.length, 1);
  assert.equal(result.calls[0].name, 'study_retention_probe_learner_consent_v1');
  assert.deepEqual(JSON.parse(JSON.stringify(result.calls[0].args)), { p_learner: 'synthetic-learner' });
});

test('registered protocol and consent receipts retain their existing contract', async () => {
  for (const data of [registered, { ...registered, decision: 'opt_in', optedIn: true, consentEventId: 'synthetic-event' }]) {
    const result = await readConsent({ data });
    assert.equal(result.status, 200);
    assert.deepEqual(result.body, data);
  }
});

test('database errors stay failures even when no consent data is returned', async () => {
  for (const data of [null, registered]) {
    const result = await readConsent({ data, error: { code: '42501', message: 'synthetic permission failure' } });
    assert.equal(result.status, 500);
    assert.deepEqual(result.body, { error: 'retention_probe_consent_unavailable' });
  }
});

test('consent read still rejects unsupported query parameters before any database call', async () => {
  const result = await readConsent({ query: '?learner=other' });
  assert.equal(result.status, 400);
  assert.equal(result.calls.length, 0);
});

function accountHarness({ consent = inactive, retentionError = null, progressError = null, expired = false } = {}) {
  const user = { id: 'synthetic-learner', providers: ['email'] };
  let html = '';
  const reported = [];
  const context = vm.createContext({
    console, Promise,
    auth: { currentUser: () => expired ? null : user, getSession: async () => expired ? null : { user }, preparationProfile: async () => null },
    cloud: {
      progress: async () => { if (progressError) throw progressError; return { attempts: 12, correct: 8 }; },
      questions: async () => ({ questions: [{}, {}, {}] }),
      retentionProbeConsent: async () => { if (retentionError) throw retentionError; return consent; }
    },
    review: { me: async () => ({ isAdmin: false, reviewKinds: [] }) },
    reportUnexpected: (_error, operation) => reported.push(operation), announce() {},
    escape: value => String(value), preparationAccountMarkup: () => '', recoveryPasswordPanel: () => '', signInMethodsPanel: () => '',
    render() { html = vm.runInContext('state.user ? signedIn() : "signed-out"', context); }
  });
  const helpers = account.slice(account.indexOf('function projectionError('), account.indexOf('\nfunction signedOut()'));
  const panel = account.slice(account.indexOf('function retentionPilotPanel('), account.indexOf('\nfunction recoveryPasswordPanel('));
  const signedIn = account.slice(account.indexOf('function signedIn()'), account.indexOf('\nfunction render()'));
  const load = account.slice(account.indexOf('async function loadReviewerAccess('), account.indexOf('\nfunction applySessionPreference('));
  vm.runInContext('let accountLoadGeneration=0;let preparationState={};const emptyProjectionErrors=()=>({progress:null,questions:null,retention:null});let state={user:auth.currentUser(),progress:null,questions:null,retentionConsent:null,projectionErrors:emptyProjectionErrors()};' + helpers + panel + signedIn + load, context);
  return { load: () => vm.runInContext('loadCloud()', context), html: () => html, reported };
}

test('inactive pilot keeps loaded metrics visible without failure warnings or opt-in controls', async () => {
  const h = accountHarness(); await h.load();
  assert.match(h.html(), /<strong>12<\/strong><span>Recorded attempts/);
  assert.match(h.html(), /<strong>8<\/strong><span>Correct/);
  assert.match(h.html(), /<strong>3<\/strong><span>Published questions/);
  assert.match(h.html(), /Retention feasibility: inactive/);
  assert.doesNotMatch(h.html(), /Some account data could not be refreshed|Consent status is unavailable|retention-optin-form|withdraw-retention/);
  assert.deepEqual(h.reported, []);
});

test('genuine retention failures keep successful metrics and report unavailable consent', async () => {
  const h = accountHarness({ retentionError: Object.assign(new Error('offline'), { status: 503 }) }); await h.load();
  assert.match(h.html(), /<strong>12<\/strong><span>Recorded attempts/);
  assert.match(h.html(), /Some account data could not be refreshed/);
  assert.match(h.html(), /Consent status is unavailable/);
  assert.doesNotMatch(h.html(), /retention-optin-form|withdraw-retention/);
  assert.deepEqual(h.reported, ['load_retention_consent']);
});

test('unavailable progress remains unknown when the optional pilot is inactive', async () => {
  const h = accountHarness({ progressError: Object.assign(new Error('offline'), { status: 503 }) }); await h.load();
  assert.match(h.html(), /<strong>—<\/strong><span>Recorded attempts/);
  assert.match(h.html(), /Some account data could not be refreshed/);
  assert.match(h.html(), /<strong>3<\/strong><span>Published questions/);
});

test('registered pilot keeps explicit opt-in and withdrawal presentation', async () => {
  const h = accountHarness({ consent: registered }); await h.load();
  assert.match(h.html(), /id="retention-optin-form"/);
  const optedIn = accountHarness({ consent: { ...registered, decision: 'opt_in', optedIn: true } }); await optedIn.load();
  assert.match(optedIn.html(), /data-action="withdraw-retention"/);
});

test('expired session signs out without displaying account or pilot data', async () => {
  const h = accountHarness({ expired: true }); await h.load();
  assert.equal(h.html(), 'signed-out');
});
