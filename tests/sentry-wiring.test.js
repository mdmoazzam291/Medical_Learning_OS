import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Sentry preview wiring is errors-only, privacy constrained, and loaded before app code', async () => {
  const bootstrap = await readFile(new URL('../web/sentry-bootstrap.js', import.meta.url), 'utf8');
  const monitoring = await readFile(new URL('../web/monitoring.js', import.meta.url), 'utf8');
  const index = await readFile(new URL('../web/index.html', import.meta.url), 'utf8');
  const account = await readFile(new URL('../web/account.html', import.meta.url), 'utf8');
  const server = await readFile(new URL('../scripts/serve.js', import.meta.url), 'utf8');

  assert.match(bootstrap, /sendDefaultPii:\s*false/);
  assert.match(bootstrap, /maxBreadcrumbs:\s*0/);
  assert.match(bootstrap, /tracesSampleRate:\s*0/);
  assert.match(bootstrap, /beforeBreadcrumb:\s*function\s*\(\)\s*\{\s*return null;/);
  assert.match(bootstrap, /beforeSendTransaction:\s*function\s*\(\)\s*\{\s*return null;/);
  assert.match(bootstrap, /window\.sentryOnLoad/);

  for (const html of [index, account]) {
    const bootstrapAt = html.indexOf('/web/sentry-bootstrap.js');
    const loaderAt = html.indexOf('https://js.sentry-cdn.com/2fa4dbdadec29f693ffec3a0f6fbce05.min.js');
    const moduleAt = Math.max(html.indexOf('/web/app.js'), html.indexOf('/web/account.js'));
    assert.ok(bootstrapAt >= 0 && loaderAt > bootstrapAt && moduleAt > loaderAt);
    assert.match(html, /data-lazy="no"/);
  }

  assert.match(monitoring, /mlos-monitoring-test-v2/);
  assert.match(monitoring, /monitoring_test/);
  assert.doesNotMatch(monitoring, /document\.createElement\('script'\)/);

  assert.match(server, /script-src 'self' https:\/\/js\.sentry-cdn\.com https:\/\/browser\.sentry-cdn\.com/);
  assert.match(server, /connect-src 'self' https:\/\/iyapppmeieqhflnzslao\.supabase\.co https:\/\/o4512152153751552\.ingest\.us\.sentry\.io/);
  assert.doesNotMatch(server, /connect-src[^"]*\*\.sentry\.io/);
});
