// Automated WCAG 2.2 A/AA audit of learner-facing pages with axe-core.
// Runs each page at phone, tablet portrait, tablet landscape and desktop sizes.
// Serious/critical violations fail unless recorded with a reason in
// ops/accessibility/baseline.json (reviewed debt). Moderate/minor are reported.
// Scope: signed-out/public render states; external requests are blocked.
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { AXE_WCAG_TAGS, DEFAULT_FAIL_IMPACTS, evaluateAccessibility } from './accessibility-gate.js';

const playwright = await import(process.env.PLAYWRIGHT_MODULE_URL || 'playwright');
const engine = process.env.BROWSER_ENGINE === 'webkit' ? playwright.webkit : playwright.chromium;
const origin = process.env.APP_URL || 'http://127.0.0.1:3000';
const allowedOrigin = new URL(origin).origin;

const axePath = process.env.AXE_CORE_PATH;
assert.ok(axePath, 'AXE_CORE_PATH must point to axe-core/axe.min.js');
const axeSource = await readFile(axePath, 'utf8');
const baseline = JSON.parse(await readFile(new URL('../ops/accessibility/baseline.json', import.meta.url), 'utf8'));
const failImpacts = process.env.A11Y_FAIL_IMPACTS
  ? process.env.A11Y_FAIL_IMPACTS.split(',').map(value => value.trim()).filter(Boolean)
  : DEFAULT_FAIL_IMPACTS;

const AUDITED_PAGES = Object.freeze([
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

const viewports = [
  ['phone', { width: 390, height: 844 }],
  ['tablet-portrait', { width: 820, height: 1180 }],
  ['tablet-landscape', { width: 1180, height: 820 }],
  ['desktop', { width: 1440, height: 1000 }]
];

const launchOptions = { headless: true };
if (process.env.CHROMIUM_EXECUTABLE && engine === playwright.chromium) {
  launchOptions.executablePath = process.env.CHROMIUM_EXECUTABLE;
}
const browser = await engine.launch(launchOptions);
const observations = [];
try {
  for (const [viewportName, viewport] of viewports) {
    // bypassCSP lets the test inject axe-core; the production CSP itself is unchanged.
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce', bypassCSP: true });
    await context.route('**/*', route =>
      new URL(route.request().url()).origin === allowedOrigin ? route.continue() : route.abort());
    const page = await context.newPage();
    for (const path of AUDITED_PAGES) {
      const response = await page.goto(`${origin}${path}`, { waitUntil: 'load' });
      assert.equal(response.status(), 200, `${path} returned ${response.status()}`);
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
      await page.addScriptTag({ content: axeSource });
      const result = await page.evaluate(async tags => {
        // eslint-disable-next-line no-undef
        const output = await axe.run(document, {
          runOnly: { type: 'tag', values: tags },
          resultTypes: ['violations']
        });
        return output.violations.map(violation => ({
          id: violation.id,
          impact: violation.impact,
          help: violation.help,
          helpUrl: violation.helpUrl,
          nodes: violation.nodes.map(node => ({ target: node.target }))
        }));
      }, [...AXE_WCAG_TAGS]);
      observations.push({ page: path, viewport: viewportName, violations: result });
    }
    await context.close();
  }
} finally {
  await browser.close();
}

const outcome = evaluateAccessibility(observations, baseline, failImpacts);
if (process.env.A11Y_REPORT_DIR) {
  await mkdir(process.env.A11Y_REPORT_DIR, { recursive: true });
  await writeFile(`${process.env.A11Y_REPORT_DIR}/accessibility-report.json`,
    JSON.stringify({ engine: engine.name(), failImpacts, ...outcome }, null, 2));
}

const describe = row => `  [${row.impact}] ${row.rule} on ${row.page} (${row.viewport}, ${row.nodes} node(s)): ${row.help}\n    ${row.targets.join(' | ')}`;
if (outcome.knownDebt.length) console.log(`Reviewed accessibility debt still present (${outcome.knownDebt.length}):\n${outcome.knownDebt.map(describe).join('\n')}`);
if (outcome.advisories.length) console.log(`Advisory (non-blocking impact) findings (${outcome.advisories.length}):\n${outcome.advisories.map(describe).join('\n')}`);
if (outcome.staleBaseline.length) console.log(`Baseline entries no longer observed — remove after review: ${outcome.staleBaseline.map(entry => `${entry.page}::${entry.rule}`).join(', ')}`);
if (!outcome.passed) {
  console.error(`Accessibility check failed: ${outcome.failures.length} new ${failImpacts.join('/')} violation(s):\n${outcome.failures.map(describe).join('\n')}`);
  process.exit(1);
}
console.log(`Accessibility checks passed in ${engine.name()}: ${AUDITED_PAGES.length} pages x ${viewports.length} viewports, WCAG tags ${AXE_WCAG_TAGS.join(', ')}.`);
