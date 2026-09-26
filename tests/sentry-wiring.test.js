import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Sentry preview wiring is errors-only and privacy constrained', async () => {
  const monitoring = await readFile(new URL('../web/monitoring.js', import.meta.url), 'utf8');
  const server = await readFile(new URL('../scripts/serve.js', import.meta.url), 'utf8');

  assert.match(monitoring, /js\.sentry-cdn\.com\/2fa4dbdadec29f693ffec3a0f6fbce05\.min\.js/);
  assert.match(monitoring, /sendDefaultPii:\s*false/);
  assert.match(monitoring, /maxBreadcrumbs:\s*0/);
  assert.match(monitoring, /tracesSampleRate:\s*0/);
  assert.match(monitoring, /beforeSendTransaction:\s*\(\)\s*=>\s*null/);
  assert.match(monitoring, /location\.hostname\.endsWith\('\.onrender\.com'\)/);
  assert.match(monitoring, /monitoring_test/);

  assert.match(server, /script-src 'self' https:\/\/js\.sentry-cdn\.com https:\/\/browser\.sentry-cdn\.com/);
  assert.match(server, /connect-src 'self' https:\/\/iyapppmeieqhflnzslao\.supabase\.co https:\/\/o4512152153751552\.ingest\.us\.sentry\.io/);
  assert.doesNotMatch(server, /connect-src[^"]*\*\.sentry\.io/);
});
