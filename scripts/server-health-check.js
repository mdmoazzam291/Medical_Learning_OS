import assert from 'node:assert/strict';

const port = 3417;
const child = (await import('node:child_process')).spawn(process.execPath, ['scripts/serve.js'], {
  env: { ...process.env, PORT: String(port), MLOS_HOST: '127.0.0.1' },
  stdio: ['ignore', 'pipe', 'pipe']
});

const base = `http://127.0.0.1:${port}`;
let output = '';
child.stdout.on('data', chunk => { output += chunk.toString(); });
child.stderr.on('data', chunk => { output += chunk.toString(); });

try {
  let response;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      response = await fetch(`${base}/healthz`);
      break;
    } catch {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  assert.ok(response, `server did not start: ${output}`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('x-frame-options'), 'DENY');
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
  assert.equal(response.headers.get('permissions-policy'), 'camera=(), microphone=(), geolocation=()');
  assert.deepEqual(await response.json(), {
    status: 'ok',
    service: 'medical-learning-os',
    check: 'health'
  });

  const root = await fetch(`${base}/`);
  assert.equal(root.status, 200);
  assert.equal(root.headers.get('x-content-type-options'), 'nosniff');
  assert.match(root.headers.get('content-security-policy') || '', /frame-ancestors 'none'/);

  const missing = await fetch(`${base}/not-found`);
  assert.equal(missing.status, 404);

  console.log('Hosted server health/security checks passed');
} finally {
  child.kill('SIGTERM');
  await new Promise(resolve => child.once('exit', resolve));
}
