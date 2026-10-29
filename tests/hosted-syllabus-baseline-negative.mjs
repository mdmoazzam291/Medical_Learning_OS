// Negative-only hosted verification for the private syllabus-draft route.
// Uses the already-public browser publishable key. Never uses user sessions, service keys, or valid writes.
import assert from 'node:assert/strict';
import { cloudConfig } from '../web/cloud-config.js';

const allowedOrigin = 'https://medical-learning-os-web.medicalos.workers.dev';
const deniedOrigin = 'https://untrusted.example.org';
const target = cloudConfig.projectUrl + '/functions/v1/owner-api/syllabus-baseline-drafts';

export async function verifyNegativeSurface(fetchFn = fetch) {
  assert.equal(cloudConfig.projectUrl, 'https://iyapppmeieqhflnzslao.supabase.co');
  assert.match(cloudConfig.publishableKey, /^sb_publishable_[A-Za-z0-9_-]+$/);
  const scenarios = [
    { name: 'allowed preflight', method: 'OPTIONS', origin: allowedOrigin, status: 200 },
    { name: 'anonymous GET', method: 'GET', origin: allowedOrigin, status: 401, error: 'unauthorized' },
    { name: 'anonymous invalid POST', method: 'POST', origin: allowedOrigin, status: 401, error: 'unauthorized', body: {} },
    { name: 'invalid bearer', method: 'GET', origin: allowedOrigin, status: 401, error: 'unauthorized', invalidToken: true },
    { name: 'disallowed origin', method: 'GET', origin: deniedOrigin, status: 403, error: 'origin_not_allowed' }
  ];
  for (const item of scenarios) {
    const headers = { apikey: cloudConfig.publishableKey, Origin: item.origin };
    if (item.invalidToken) headers.Authorization = 'Bearer invalid.example.token';
    if (item.body) headers['Content-Type'] = 'application/json';
    if (item.method === 'OPTIONS') {
      headers['Access-Control-Request-Method'] = 'POST';
      headers['Access-Control-Request-Headers'] = 'authorization, apikey, content-type';
    }
    let response;
    try {
      response = await fetchFn(target, {
        method: item.method, headers,
        ...(item.body ? { body: JSON.stringify(item.body) } : {}),
        signal: AbortSignal.timeout(12000)
      });
    } catch {
      throw new Error(item.name + ': transport unavailable, so no status can be claimed');
    }
    assert.equal(response.status, item.status, item.name + ': HTTP status');
    assert.equal(response.headers.get('access-control-allow-origin'),
      item.origin === deniedOrigin ? null : allowedOrigin, item.name + ': exact origin policy');
    if (item.method === 'OPTIONS') {
      assert.match(response.headers.get('access-control-allow-methods') || '', /POST/, 'preflight methods');
    } else {
      assert.equal(response.headers.get('cache-control'), 'no-store', item.name + ': no-store');
      const data = await response.json();
      assert.equal(data?.error, item.error, item.name + ': error code');
    }
  }
  return scenarios.length;
}

async function main() {
  if (process.argv[2] === '--self-test') {
    const fakeFetch = async (_url, options) => {
      const badOrigin = options.headers.Origin === deniedOrigin;
      const status = options.method === 'OPTIONS' ? 200 : badOrigin ? 403 : 401;
      return new Response(JSON.stringify({ error: badOrigin ? 'origin_not_allowed' : 'unauthorized' }), {
        status,
        headers: {
          ...(badOrigin ? {} : { 'Access-Control-Allow-Origin': allowedOrigin }),
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Cache-Control': 'no-store'
        }
      });
    };
    assert.equal(await verifyNegativeSurface(fakeFetch), 5);
    await assert.rejects(verifyNegativeSurface(async () => { throw new Error('offline'); }), /transport unavailable/);
    console.log('PASS: five simulated negative/CORS contracts and transport failure detection');
  } else if (process.argv[2] === '--hosted') {
    const checks = await verifyNegativeSurface();
    console.log('PASS: ' + checks + ' REAL hosted negative/CORS checks; no authenticated role or write tested');
  } else {
    throw new Error('Use --self-test or --hosted');
  }
}
main().catch(error => { console.error('FAILED: ' + error.message); process.exitCode = 1; });
