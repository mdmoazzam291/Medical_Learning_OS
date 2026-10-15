import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../scripts/cashfree-probe-once.sh', import.meta.url));

test('one-shot shell syntax and user confirmation guard are valid', async () => {
  const shell = spawnSync('bash', ['-n', script], { encoding: 'utf8' });
  assert.equal(shell.status, 0, shell.stderr);
  const unapproved = spawnSync('bash', [script], {
    encoding: 'utf8',
    env: { ...process.env, MLOS_CONFIRM_ONE_CASHFREE_GET: '' }
  });
  assert.equal(unapproved.status, 2);
  assert.match(unapproved.stdout, /Refusing to start/);
});

test('one-shot command is remote-dev only, never an account deployment or scheduled cron', async () => {
  const s = await readFile(script, 'utf8');
  assert.match(s, /wrangler@\^4\.119\.0 dev --remote --test-scheduled/);
  assert.match(s, /wrangler\.cashfree-sandbox\.jsonc/);
  assert.match(s, /--ip 127\.0\.0\.1 --port 8787/);
  assert.match(s, /--var CASHFREE_SANDBOX_ENABLED:true/);
  assert.match(s, /--var CASHFREE_SANDBOX_NETWORK_TESTS_ENABLED:true/);
  assert.match(s, /--var CASHFREE_SANDBOX_RUN_MODE:auth_probe/);
  assert.match(s, /http:\/\/127\.0\.0\.1:8787\/cdn-cgi\/local\/scheduled/);
  assert.doesNotMatch(s, /\bnpx [^\n]*wrangler[^\n]* (?:deploy|secret put|versions deploy)\b/);
  assert.doesNotMatch(s, /CASHFREE_TEST_APP_ID=[^\n]+|CASHFREE_TEST_SECRET_KEY=[^\n]+/);
  assert.match(s, /trap cleanup EXIT/);
  assert.match(s, /trap 'exit 130' INT/);
  assert.match(s, /trap 'exit 143' TERM/);
  assert.match(s, /MLOS_CONFIRM_ONE_CASHFREE_GET/);
});

test('deployed sandbox Wrangler config still has no triggers, routes or network activation', async () => {
  const c = JSON.parse(await readFile(new URL('../wrangler.cashfree-sandbox.jsonc', import.meta.url), 'utf8'));
  assert.equal(c.name, 'mlos-cashfree-sandbox');
  assert.deepEqual(c.triggers.crons, []);
  assert.equal(c.workers_dev, false);
  assert.equal(c.preview_urls, false);
  assert.equal(c.vars.CASHFREE_SANDBOX_ENABLED, 'false');
  assert.equal(c.vars.CASHFREE_SANDBOX_NETWORK_TESTS_ENABLED, 'false');
  assert.equal(c.vars.CASHFREE_SANDBOX_RUN_MODE, 'disabled');
});
