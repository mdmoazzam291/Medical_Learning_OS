import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, copyFileSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

// The real Actions gate runs, while the adjacent network-capable runner is
// replaced by a recording fixture. No credentials or network are used.
function run(overrides = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'mlos-actions-gate-'));
  try {
    copyFileSync('scripts/cashfree-actions-once.sh', join(dir, 'gate.sh'));
    writeFileSync(join(dir, 'cashfree-probe-once.sh'),
      '#!/usr/bin/env bash\nprintf "%s\\n" "$MLOS_CONFIRM_ONE_CASHFREE_GET" >> "$PROBE_MARKER"\nexit "${FIXTURE_EXIT:-0}"\n');
    const marker = join(dir, 'invocations');
    const env = {
      PATH: process.env.PATH,
      GITHUB_ACTIONS: 'true', GITHUB_EVENT_NAME: 'workflow_dispatch',
      GITHUB_REPOSITORY: 'mdmoazzam291/Medical_Learning_OS',
      GITHUB_REF: 'refs/heads/main', GITHUB_RUN_ATTEMPT: '1',
      MLOS_CONFIRM_ONE_CASHFREE_GET: 'YES_TEST_ONLY',
      CLOUDFLARE_API_TOKEN: 'fixture_value_for_offline_tests_only',
      PROBE_MARKER: marker, ...overrides
    };
    const result = spawnSync('bash', [join(dir, 'gate.sh')], { env, encoding: 'utf8' });
    return { ...result, invocations: existsSync(marker) ? readFileSync(marker, 'utf8') : '' };
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

test('manual Actions gate invokes the reviewed runner once with explicit consent', () => {
  const result = run();
  assert.equal(result.status, 0);
  assert.equal(result.invocations, 'YES_TEST_ONLY\n');
  assert.doesNotMatch(result.stdout + result.stderr, /fixture_value/);
});

for (const [field, value] of Object.entries({
  GITHUB_ACTIONS: 'false', GITHUB_EVENT_NAME: 'push',
  GITHUB_REPOSITORY: 'someone/other', GITHUB_REF: 'refs/heads/unreviewed',
  GITHUB_RUN_ATTEMPT: '2', MLOS_CONFIRM_ONE_CASHFREE_GET: 'CANCEL'
})) {
  test(`Actions gate rejects ${field} before any provider runner`, () => {
    const result = run({ [field]: value });
    assert.notEqual(result.status, 0);
    assert.equal(result.invocations, '');
  });
}

for (const value of ['', 'Bearer fixture_private_value', 'fixture_private_value\nextra', '"fixture_private_value"', '-H fixture_private_value']) {
  test('Actions gate rejects missing or malformed token without exposing its value', () => {
    const result = run({ CLOUDFLARE_API_TOKEN: value });
    assert.notEqual(result.status, 0);
    assert.equal(result.invocations, '');
    assert.doesNotMatch(result.stdout + result.stderr, /fixture_private_value/);
  });
}

test('Actions gate propagates failure without retrying the provider runner', () => {
  const result = run({ FIXTURE_EXIT: '19' });
  assert.equal(result.status, 19);
  assert.equal(result.invocations, 'YES_TEST_ONLY\n');
});
