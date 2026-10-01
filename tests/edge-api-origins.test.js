import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { runInNewContext } from 'node:vm';

const cloudflare = 'https://medical-learning-os-web.medicalos.workers.dev';
const render = 'https://medical-learning-os-preview.onrender.com';

// Execute the real handlers with external services stubbed. No learner data is read or written.
for (const name of ['study-api', 'review-api', 'retention-probe-api']) {
  const source = readFileSync(new URL(`../supabase/functions/${name}/index.ts`, import.meta.url), 'utf8');
  const script = stripTypeScriptTypes(source.replace(/^import\s[\s\S]*?;\s*$/gm, ''), { mode: 'transform' });
  let handler;
  const env = {
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_ANON_KEY: 'test-public',
    SUPABASE_SERVICE_ROLE_KEY: 'test-private'
  };
  runInNewContext(script, {
    Deno: { env: { get: key => env[key] }, serve: fn => { handler = fn; } },
    Response, Request, URL, TextEncoder,
    fsrs: () => ({}),
    createClient: () => ({ auth: { getUser: async () => ({ data: { user: null }, error: { message: 'invalid token' } }) } })
  });
  const request = (origin, method = 'OPTIONS', authorization) => handler(new Request(`https://example.supabase.co/functions/v1/${name}/progress`, {
    method,
    headers: { Origin: origin, 'Access-Control-Request-Method': 'GET', 'Access-Control-Request-Headers': 'apikey,authorization', ...(authorization ? { Authorization: authorization } : {}) }
  }));

  test(`${name}: deployed learner origins pass preflight`, async () => {
    for (const origin of [cloudflare, render, 'http://127.0.0.1:3000']) {
      const response = await request(origin);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('Access-Control-Allow-Origin'), origin);
      assert.match(response.headers.get('Access-Control-Allow-Headers'), /authorization/);
      assert.match(response.headers.get('Vary'), /Origin/);
    }
  });

  test(`${name}: unrelated and lookalike origins remain denied`, async () => {
    for (const origin of ['https://example.invalid', `${cloudflare}.evil.example`, 'https://other.medicalos.workers.dev', cloudflare.replace('https:', 'http:')]) {
      const response = await request(origin);
      assert.equal(response.status, 403);
      assert.equal(response.headers.get('Access-Control-Allow-Origin'), null);
      assert.deepEqual(await response.json(), { error: 'origin_not_allowed' });
    }
  });

  test(`${name}: Cloudflare origin does not bypass user authentication`, async () => {
    for (const authorization of [undefined, 'Bearer invalid-token']) {
      const response = await request(cloudflare, 'GET', authorization);
      assert.equal(response.status, 401);
      assert.equal(response.headers.get('Access-Control-Allow-Origin'), cloudflare);
      assert.deepEqual(await response.json(), { error: 'unauthorized' });
    }
  });
}
