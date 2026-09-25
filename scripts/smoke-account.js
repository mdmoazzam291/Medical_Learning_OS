import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import assert from 'node:assert/strict';

async function freePort() {
  const socket = createServer();
  await new Promise(resolve => socket.listen(0, '127.0.0.1', resolve));
  const port = socket.address().port;
  await new Promise(resolve => socket.close(resolve));
  return port;
}
const apiPort = await freePort(), webPort = await freePort();
const env = { ...process.env, MLOS_AUTH_MODE: 'supabase',
  MLOS_SUPABASE_URL: 'https://iyapppmeieqhflnzslao.supabase.co',
  MLOS_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_only',
  MLOS_DB_PATH: ':memory:', MLOS_API_PORT: String(apiPort), PORT: String(webPort) };
const api = spawn(process.execPath, ['scripts/api.js'], { env, stdio: 'ignore' });
const web = spawn(process.execPath, ['scripts/serve.js'], { env, stdio: 'ignore' });
try {
  const base = `http://127.0.0.1:${webPort}`;
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      const [webReady, apiReady] = await Promise.all([
        fetch(base + '/auth-config'), fetch(`http://127.0.0.1:${apiPort}/health`),
      ]);
      if (webReady.ok && apiReady.ok) break;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.equal((await fetch(base + '/web/account.html')).status, 200);
  assert.equal((await fetch(base + '/web/account.bundle.js')).status, 200);
  const config = await (await fetch(base + '/auth-config')).json();
  assert.equal(config.url, env.MLOS_SUPABASE_URL);
  assert.equal((await fetch(base + '/api/progress')).status, 401);
  assert.equal((await fetch(base + '/api/progress', { headers: { Authorization: 'Bearer too-short' } })).status, 401);
  assert.equal((await fetch(base + '/docs/STATUS.md')).status, 404);
  console.log('Account preview smoke passed: routes, config, unauthenticated API and private files');
} finally {
  web.kill(); api.kill();
}
