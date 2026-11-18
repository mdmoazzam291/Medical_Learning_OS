// Automated WCAG 2.2 A/AA audit of learner-facing pages with axe-core.
// Two passes at phone, tablet portrait, tablet landscape and desktop sizes:
//  1. signed-out/public render states;
//  2. signed-in learner states with a synthetic session and synthetic API
//     fixtures (no real accounts, no writes: any non-GET request fails the run).
// Serious/critical violations fail unless recorded with a reason in
// ops/accessibility/baseline.json (reviewed debt). Moderate/minor are reported.
// BROWSER_ENGINE=webkit runs the same audit in WebKit (Safari engine).
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { AXE_WCAG_TAGS, DEFAULT_FAIL_IMPACTS, evaluateAccessibility } from './accessibility-gate.js';
import { cloudConfig } from '../web/cloud-config.js';
import { profile as preparationProfile, curriculum, library } from '../tests/fixtures/preparation-fixture.js';

const playwright = await import(process.env.PLAYWRIGHT_MODULE_URL || 'playwright');
const engine = process.env.BROWSER_ENGINE === 'webkit' ? playwright.webkit : playwright.chromium;
const origin = process.env.APP_URL || 'http://127.0.0.1:3000';
const allowedOrigin = new URL(origin).origin;
const apiOrigin = new URL(cloudConfig.projectUrl).origin;

const axePath = process.env.AXE_CORE_PATH;
assert.ok(axePath, 'AXE_CORE_PATH must point to axe-core/axe.min.js');
const axeSource = await readFile(axePath, 'utf8');
const baseline = JSON.parse(await readFile(new URL('../ops/accessibility/baseline.json', import.meta.url), 'utf8'));
const failImpacts = process.env.A11Y_FAIL_IMPACTS
  ? process.env.A11Y_FAIL_IMPACTS.split(',').map(value => value.trim()).filter(Boolean)
  : DEFAULT_FAIL_IMPACTS;

const PUBLIC_PAGES = Object.freeze([
  '/',
  '/web/account.html',
  '/web/plans.html',
  '/web/library.html',
  '/web/vault.html',
  '/web/exam.html',
  '/web/workspace.html',
  '/web/review.html',
  '/web/retention.html',
  '/web/medical.html',
  '/web/nmc-catalogue.html',
  '/web/services.html',
  '/web/contact.html',
  '/web/terms.html',
  '/web/privacy.html',
  '/web/refunds.html',
  '/web/delivery.html'
]);

// Learner workspaces as a signed-in, non-admin learner sees them.
const SIGNED_IN_PAGES = Object.freeze([
  '/',
  '/web/account.html',
  '/web/medical.html',
  '/web/workspace.html',
  '/web/library.html',
  '/web/library.html?view=notes&concept=shared',
  '/web/vault.html',
  '/web/vault.html?concept=shared',
  '/web/exam.html',
  '/web/retention.html',
  '/web/review.html',
  '/web/nmc-catalogue.html',
  '/web/plans.html'
]);

const viewports = [
  ['phone', { width: 390, height: 844 }],
  ['tablet-portrait', { width: 820, height: 1180 }],
  ['tablet-landscape', { width: 1180, height: 820 }],
  ['desktop', { width: 1440, height: 1000 }]
];

const learnerId = '11111111-1111-4111-8111-111111111111';
const learnerEmail = 'synthetic@example.invalid';
const syntheticSession = { accessToken: 'synthetic', refreshToken: 'synthetic', expiresAt: 2100000000, user: { id: learnerId, email: learnerEmail, providers: ['email'] } };
const learnerUser = { id: learnerId, email: learnerEmail, app_metadata: { providers: ['email'] }, user_metadata: { mlos_preparation_profile: preparationProfile } };
const vaultConcepts = [
  { conceptId: 'shared', label: 'Synthetic concept', aliases: ['Synthetic alias'], subjectTags: ['Medicine'], annotationCount: 0, canonicalNote: { noteVersionId: '11111111-1111-4111-8111-111111111112' } },
  { conceptId: 'foundation', label: 'Unpublished synthetic concept', aliases: [], subjectTags: [], annotationCount: 0 }
];

const syntheticVaultNote = { noteVersionId: '11111111-1111-4111-8111-111111111112', version: 1, title: 'Synthetic interface note', bodyMarkdown: '# Interface fixture\n\n## 01 Core\nSynthetic interface fixture — no clinical teaching.\n\n## 11 Revision\n- Review private context\n- Return to your question', contentSha256: 'e'.repeat(64) };

// Synthetic GET fixtures keyed by API path suffix. Unlisted GETs receive {} so
// every page still renders its real empty/fallback state.
const signedInFixtures = [
  ['/auth/v1/user', () => learnerUser],
  ['/review-api/me', () => ({ isAdmin: false, reviewKinds: [] })],
  ['/study-api/progress', () => ({ attempts: 7, correct: 4 })],
  ['/study-api/questions', () => ({ questions: [] })],
  ['/study-api/vault/concepts', () => ({ catalogVersion: 1, concepts: vaultConcepts })],
  ['/content-library-api/library', () => ({ ...library(), preparation: { profile: preparationProfile, curriculum: curriculum() } })],
  ['/study-api/retention-probe/consent', () => ({ contractId: 'retention-probe-learner-consent-v1', availability: 'inactive', reason: 'no_preregistered_protocol', protocol: null, decision: 'not_decided', optedIn: false, lastDecisionAt: null, consentEventId: null, activationAuthority: false, probeSchedulingEnabled: false, masteryInferenceAuthority: false })]
];

async function routeSignedInApi(route, unexpectedWrites) {
  const request = route.request();
  const url = new URL(request.url());
  const reply = body => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  if (url.pathname === '/auth/v1/token' && url.searchParams.get('grant_type') === 'refresh_token') {
    return reply({ access_token: 'synthetic', refresh_token: 'synthetic', expires_at: 2100000000, user: learnerUser });
  }
  if (request.method() !== 'GET') {
    unexpectedWrites.push(`${request.method()} ${url.pathname}`);
    return route.fulfill({ status: 405, contentType: 'application/json', body: '{"error":"audit_is_read_only"}' });
  }
  const vaultDetail = url.pathname.split('/study-api/vault/concepts/')[1];
  if (vaultDetail) {
    const concept = vaultConcepts.find(item => item.conceptId === decodeURIComponent(vaultDetail)) ?? vaultConcepts[0];
    return reply({ concept, canonicalNote: concept.conceptId === 'shared' ? syntheticVaultNote : null, annotations: [] });
  }
  const fixture = signedInFixtures.find(([suffix]) => url.pathname.endsWith(suffix));
  return reply(fixture ? fixture[1]() : {});
}

const launchOptions = { headless: true };
if (process.env.CHROMIUM_EXECUTABLE && engine === playwright.chromium) {
  launchOptions.executablePath = process.env.CHROMIUM_EXECUTABLE;
}
const browser = await engine.launch(launchOptions);
const observations = [];
const unexpectedWrites = [];
const pageErrors = [];

async function audit(page, path, label) {
  page.currentPath = path;
  const response = await page.goto(`${origin}${path}`, { waitUntil: 'load' });
  assert.equal(response.status(), 200, `${path} returned ${response.status()}`);
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
  await page.addScriptTag({ content: axeSource });
  return page.evaluate(async tags => {
    // eslint-disable-next-line no-undef
    const output = await axe.run(document, { runOnly: { type: 'tag', values: tags }, resultTypes: ['violations'] });
    return output.violations.map(violation => ({
      id: violation.id,
      impact: violation.impact,
      help: violation.help,
      helpUrl: violation.helpUrl,
      nodes: violation.nodes.map(node => ({ target: node.target }))
    }));
  }, [...AXE_WCAG_TAGS]).then(violations => observations.push({ page: label, viewport: page.viewportName, violations }));
}

try {
  for (const signedIn of [false, true]) {
    const pages = signedIn ? SIGNED_IN_PAGES : PUBLIC_PAGES;
    for (const [viewportName, viewport] of viewports) {
      // bypassCSP lets the test inject axe-core; the production CSP itself is unchanged.
      const context = await browser.newContext({ viewport, reducedMotion: 'reduce', bypassCSP: true });
      if (signedIn) {
        await context.addInitScript(session => {
          if (window === window.top) localStorage.setItem('mlos-supabase-auth-v1', JSON.stringify(session));
        }, syntheticSession);
      }
      await context.route('**/*', route => {
        const requestOrigin = new URL(route.request().url()).origin;
        if (requestOrigin === allowedOrigin) return route.continue();
        if (signedIn && requestOrigin === apiOrigin) return routeSignedInApi(route, unexpectedWrites);
        return route.abort();
      });
      const page = await context.newPage();
      page.viewportName = viewportName;
      if (signedIn) page.on('pageerror', error => pageErrors.push(`${viewportName} ${page.currentPath}: ${error.message}`));
      for (const path of pages) {
        await audit(page, path, signedIn ? `${path} [signed-in]` : path);
      }
      await context.close();
    }
  }
} finally {
  await browser.close();
}

assert.deepEqual(unexpectedWrites, [], 'Signed-in audit must not write');
assert.deepEqual(pageErrors, [], 'Signed-in pages raised script errors');

const outcome = evaluateAccessibility(observations, baseline, failImpacts);
if (process.env.A11Y_REPORT_DIR) {
  await mkdir(process.env.A11Y_REPORT_DIR, { recursive: true });
  await writeFile(`${process.env.A11Y_REPORT_DIR}/accessibility-report-${engine.name()}.json`,
    JSON.stringify({ engine: engine.name(), failImpacts, ...outcome }, null, 2));
}

const describe = row => `  [${row.impact}] ${row.rule} on ${row.page} (${row.viewport}, ${row.nodes} node(s)): ${row.help}\n    ${row.targets.join(' | ')}`;
if (outcome.knownDebt.length) console.log(`Reviewed accessibility debt still present (${outcome.knownDebt.length}):\n${outcome.knownDebt.map(describe).join('\n')}`);
if (outcome.advisories.length) console.log(`Advisory (non-blocking impact) findings (${outcome.advisories.length}):\n${outcome.advisories.map(describe).join('\n')}`);
if (outcome.staleBaseline.length) console.log(`Baseline entries not observed in this engine — remove after review if fixed everywhere: ${outcome.staleBaseline.map(entry => `${entry.page}::${entry.rule}`).join(', ')}`);
if (!outcome.passed) {
  console.error(`Accessibility check failed in ${engine.name()}: ${outcome.failures.length} new ${failImpacts.join('/')} violation(s):\n${outcome.failures.map(describe).join('\n')}`);
  process.exit(1);
}
const audits = (PUBLIC_PAGES.length + SIGNED_IN_PAGES.length) * viewports.length;
console.log(`Accessibility checks passed in ${engine.name()}: ${PUBLIC_PAGES.length} signed-out + ${SIGNED_IN_PAGES.length} signed-in pages x ${viewports.length} viewports (${audits} audits), WCAG tags ${AXE_WCAG_TAGS.join(', ')}.`);
