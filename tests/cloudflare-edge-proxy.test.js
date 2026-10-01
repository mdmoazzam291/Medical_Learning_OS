import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../cloudflare/edge-worker.js';

const origin = 'https://medical-learning-os-preview.onrender.com';

test('edge health is served without touching the Render origin', async () => {
  const originalFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = async () => {
    called = true;
    throw new Error('should_not_fetch');
  };

  try {
    const response = await worker.fetch(new Request('https://edge.example/__edge-health'), { ORIGIN_BASE_URL: origin });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('x-mlos-edge'), 'cloudflare');
    assert.deepEqual(await response.json(), {
      ok: true,
      service: 'medical-learning-os-edge',
      origin: 'medical-learning-os-preview.onrender.com'
    });
    assert.equal(called, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('edge proxies path, query, method and body to the canonical Render origin', async () => {
  const originalFetch = globalThis.fetch;
  let seen;
  globalThis.fetch = async request => {
    seen = request;
    return new Response('origin-ok', { status: 200, headers: { 'Content-Type': 'text/plain' } });
  };

  try {
    const request = new Request('https://edge.example/mcp?mode=readonly', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ping: true })
    });
    const response = await worker.fetch(request, { ORIGIN_BASE_URL: origin });

    assert.equal(seen.url, `${origin}/mcp?mode=readonly`);
    assert.equal(seen.method, 'POST');
    assert.equal(await seen.text(), JSON.stringify({ ping: true }));
    assert.equal(await response.text(), 'origin-ok');
    assert.equal(response.headers.get('x-mlos-edge'), 'cloudflare');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('edge fails closed with a learner-readable 503 if origin fetch fails', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('dns_failure'); };

  try {
    const response = await worker.fetch(new Request('https://edge.example/web/account.html'), { ORIGIN_BASE_URL: origin });
    assert.equal(response.status, 503);
    assert.equal(response.headers.get('x-mlos-edge'), 'cloudflare');
    assert.match(await response.text(), /temporarily unavailable/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('edge rejects an accidental self-referential origin configuration', async () => {
  const response = await worker.fetch(
    new Request('https://medical-learning-os-edge.example/web/account.html'),
    { ORIGIN_BASE_URL: 'https://medical-learning-os-edge.example' }
  );
  assert.equal(response.status, 503);
});
