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

// Verify the actual Cloudflare preview is reachable, and that both deployed
// APIs answer only the exact review-page Origin. No user session is involved.
export async function verifyPreviewSurface(fetchFn = fetch) {
  const origin = 'https://feat-admin-syllabus-baseline-drafts-202-medical-learning-os-web.medicalos.workers.dev';
  const page = await fetchFn(origin + '/web/concept-http-check.html', {
    method: 'GET', cache: 'no-store', signal: AbortSignal.timeout(12000)
  });
  assert.equal(page.status, 200, 'exact Cloudflare syllabus preview HTTP');
  const html = await page.text();
  assert.match(html, /id="syllabus-admin"/, 'Admin syllabus button deployed');
  assert.match(html, /id="syllabus-learner"/, 'learner syllabus button deployed');
  for (const route of ['owner-api/syllabus-baseline-drafts', 'review-api/me']) {
    const endpoint = cloudConfig.projectUrl + '/functions/v1/' + route;
    const response = await fetchFn(endpoint, {
      method: 'OPTIONS',
      headers: {
        apikey: cloudConfig.publishableKey,
        Origin: origin,
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'authorization, apikey, content-type'
      },
      signal: AbortSignal.timeout(12000)
    });
    assert.equal(response.status, 200, route + ': preflight status');
    assert.equal(response.headers.get('access-control-allow-origin'), origin, route + ': exact CORS origin');
  }
  return 3;
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
    const preview = await verifyPreviewSurface();
    console.log('PASS: ' + checks + ' real negative/CORS cases and ' + preview + ' preview/origin checks; no authenticated role or write tested');
  } else {
    throw new Error('Use --self-test or --hosted');
  }
}
main().catch(error => { console.error('FAILED: ' + error.message); process.exitCode = 1; });
