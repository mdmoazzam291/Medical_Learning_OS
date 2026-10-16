import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile, copyFile, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const runner = fileURLToPath(new URL('../scripts/cashfree-probe-once.sh', import.meta.url));
const config = fileURLToPath(new URL('../wrangler.cashfree-sandbox.jsonc', import.meta.url));
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
// Only npx/curl are replaced: the real runner controls real child processes.
// No Cloudflare session, credentials, port listener or provider request is used.
for (const scenario of ['success', 'transport', 'trigger404', 'missing_result', 'startup_exit', 'SIGTERM', 'SIGINT', 'SIGTERM_readiness_curl']) {
  test(`Cashfree runner stops descendants on ${scenario}`, { timeout: 15000 }, async t => {
    const directory = await mkdtemp(join(tmpdir(), 'mlos-runner-cleanup-'));
    const scratch = join(directory, 'scratch');
    await mkdir(scratch);
    await copyFile(config, join(directory, 'wrangler.cashfree-sandbox.jsonc'));
    await writeFile(join(directory, 'npx'), `#!/usr/bin/env bash
bash -c 'trap "" TERM; i=0; while :; do printf "%s" "$((i+=1))" > "$MLOS_FIXTURE_HEARTBEAT"; sleep 0.05; done' &
child=$!
printf '%s %s' "$$" "$child" > "$MLOS_FIXTURE_PIDS.tmp"
mv "$MLOS_FIXTURE_PIDS.tmp" "$MLOS_FIXTURE_PIDS"
if [[ "$MLOS_FIXTURE_SCENARIO" == transport ]]; then
  echo 'cashfree_sandbox_probe auth_probe_status transport_failed'
  echo 'cashfree_sandbox_transport type_error'
  echo 'PRIVATE diagnostic must never escape'
elif [[ "$MLOS_FIXTURE_SCENARIO" != missing_result ]]; then
  echo 'cashfree_sandbox_probe auth_probe_status unauthorized'
fi
if [[ "$MLOS_FIXTURE_SCENARIO" == startup_exit ]]; then exit 3; fi
wait "$child"
`, { mode: 0o700 });
    await writeFile(join(directory, 'curl'), `#!/usr/bin/env bash
if [[ ! -f "$MLOS_FIXTURE_FIRST_CURL" ]]; then
  touch "$MLOS_FIXTURE_FIRST_CURL"
  exit 7
fi
if [[ "$*" == *scheduled* ]]; then
  echo event >> "$MLOS_FIXTURE_EVENTS"
  # Wrangler 4.151.0 remote middleware matches ONLY /__scheduled.
  # Local Miniflare's /cdn-cgi/local/scheduled must not pass this fixture.
  if [[ "$*" == *http://127.0.0.1:8787/__scheduled && "$MLOS_FIXTURE_SCENARIO" != trigger404 ]]; then
    printf 200
  else
    printf 404
  fi
elif [[ "$MLOS_FIXTURE_SCENARIO" == SIGTERM_readiness_curl ]]; then
  touch "$MLOS_FIXTURE_CURL_STARTED"
  sleep 1
  printf 503
elif [[ "$MLOS_FIXTURE_SCENARIO" == success || "$MLOS_FIXTURE_SCENARIO" == transport || "$MLOS_FIXTURE_SCENARIO" == trigger404 || "$MLOS_FIXTURE_SCENARIO" == missing_result ]]; then
  printf 404
else
  printf 503
fi
`, { mode: 0o700 });
    const child = spawn('bash', [runner], {
      cwd: directory, detached: true,
      env: { ...process.env, PATH: directory + ':' + process.env.PATH, TMPDIR: scratch,
        MLOS_CONFIRM_ONE_CASHFREE_GET: 'YES_TEST_ONLY', MLOS_FIXTURE_SCENARIO: scenario,
        MLOS_FIXTURE_PIDS: join(directory, 'pids'), MLOS_FIXTURE_FIRST_CURL: join(directory, 'first-curl'),
        MLOS_FIXTURE_CURL_STARTED: join(directory, 'curl-started'), MLOS_FIXTURE_HEARTBEAT: join(directory, 'heartbeat'), MLOS_FIXTURE_EVENTS: join(directory, 'events') },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let output = '', pids = [];
    child.stdout.on('data', data => { output += data; });
    child.stderr.on('data', data => { output += data; });
    const finished = new Promise((resolve, reject) => {
      child.once('error', reject);
      child.once('exit', (code, signal) => resolve({ code, signal }));
    });
    t.after(async () => {
      // Test safety net also cleans up the intentionally failing old runner.
      for (const pid of [child.pid, ...pids].filter(pid => Number.isInteger(pid) && pid > 1)) {
        try { process.kill(-pid, 'SIGKILL'); } catch {}
        try { process.kill(pid, 'SIGKILL'); } catch {}
      }
      await rm(directory, { recursive: true, force: true });
    });
    for (let attempt = 0; attempt < 100; attempt++) {
      try {
        const record = await readFile(join(directory, 'pids'), 'utf8');
        if (!/^[1-9]\d* [1-9]\d*$/.test(record)) throw new Error('incomplete PID record');
        pids = record.split(' ').map(Number);
        await readFile(join(directory, 'heartbeat'), 'utf8');
        break;
      }
      catch { await pause(20); }
    }
    assert.equal(pids.length, 2, 'mock preview must start');
    // Allow the descendant to install its TERM handler before cancellation.
    await pause(100);
    if (scenario === 'SIGTERM_readiness_curl') {
      let started = false;
      for (let attempt = 0; attempt < 100; attempt++) {
        try { await readFile(join(directory, 'curl-started')); started = true; break; }
        catch { await pause(20); }
      }
      assert.equal(started, true, 'readiness curl must be in progress');
    }
    if (scenario.startsWith('SIG')) child.kill(scenario.split('_')[0]);
    const timeout = setTimeout(() => {
      try { process.kill(-child.pid, 'SIGKILL'); } catch {}
    }, 10000);
    const result = await finished;
    clearTimeout(timeout);
    assert.equal(result.code, ['success', 'transport'].includes(scenario) ? 0 : scenario === 'SIGINT' ? 130 : scenario.startsWith('SIGTERM') ? 143 : 1, output);
    if (scenario === 'success') {
      assert.match(output, /Cashfree TEST response classification: unauthorized/);
    }
    if (scenario === 'transport') {
      assert.match(output, /Cashfree TEST response classification: transport_failed/);
      assert.match(output, /Cashfree TEST transport category: type_error/);
      assert.doesNotMatch(output, /PRIVATE/);
    }
    if (scenario === 'trigger404' || scenario === 'missing_result') {
      assert.match(output, /No verified provider result captured/);
      assert.doesNotMatch(output, /Cashfree TEST response classification:/);
    }
    const heartbeat = await readFile(join(directory, 'heartbeat'), 'utf8');
    await pause(200);
    assert.equal(await readFile(join(directory, 'heartbeat'), 'utf8'), heartbeat, 'preview descendant must stop producing work before the runner exits');
    const events = await readFile(join(directory, 'events'), 'utf8').catch(() => '');
    assert.equal(events.trim().split('\n').filter(Boolean).length, ['success', 'transport', 'trigger404', 'missing_result'].includes(scenario) ? 1 : 0);
    const files = await readdir(scratch);
    assert.deepEqual(files, [], 'temporary logs must be removed');
  });
}
