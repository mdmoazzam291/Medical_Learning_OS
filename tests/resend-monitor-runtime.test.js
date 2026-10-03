import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { runInNewContext } from 'node:vm';

// Exercise the deployed probe; only the external HTTP boundary is replaced.
const source = readFileSync(new URL('../supabase/functions/infrastructure-monitor/index.ts', import.meta.url), 'utf8');
const script = stripTypeScriptTypes(source.replace(/^import\s[^\n]*;\s*$/gm, ''), { mode: 'transform' });
const usage = () => ({
  object: 'usage',
  emails: {
    daily: { used: 10, limit: 100, sent: 8, received: 2, resets_at: '2026-10-04T00:00:00Z' },
    monthly: { used: 100, limit: 3000, sent: 80, received: 20, resets_at: '2026-11-01T00:00:00Z' }
  },
  contacts: { used: 0, limit: 1000 }, segments: { used: 1, limit: 3 },
  broadcasts: { used: 0, limit: null }, domains: { used: 0, limit: 3 },
  ai_credits: { used: 0, limit: 5, next_increase_at: null },
  automation_runs: { used: 0, limit: 10000, resets_at: '2026-11-01T00:00:00Z' },
  rate_limit: { limit: 10, duration: '1000ms' }
});

async function probe(body, status = 200, credential = 'synthetic-key') {
  const context = {
    Deno: { env: { get: key => key === 'RESEND_API_KEY' ? credential : undefined }, serve() {} },
    Response, AbortController, setTimeout, clearTimeout,
    fetch: async (url, init) => {
      assert.equal(url, 'https://api.resend.com/usage');
      assert.equal(init.headers.authorization, 'Bearer synthetic-key');
      return new Response(typeof body === 'string' ? body : JSON.stringify(body), { status });
    }
  };
  runInNewContext(script, context);
  return context.resendProbe({ rpc: async () => ({ data: null, error: null }) });
}

test('usage credential restrictions are configuration gaps, not provider outages', async () => {
  for (const status of [401, 403]) {
    const result = await probe({ name: 'restricted_api_key', message: 'This API key is restricted to only send emails' }, status);
    assert.equal(result.status, 'configured');
    assert.equal(result.source, 'credential_permission_required');
    assert.equal(result.metrics.readTelemetryConnected, false);
    assert.equal(result.metrics.httpStatus, status);
  }
});

test('malformed successful usage responses cannot claim healthy or invent zero usage', async () => {
  const missingMonthly = usage(); delete missingMonthly.emails.monthly;
  const negativeUsed = usage(); negativeUsed.emails.daily.used = -1;
  const stringUsed = usage(); stringUsed.emails.daily.used = '10';
  const missingLimit = usage(); delete missingLimit.emails.daily.limit;
  const nullUsed = usage(); nullUsed.emails.daily.used = null;
  const negativeLimit = usage(); negativeLimit.emails.monthly.limit = -1;
  for (const body of [null, {}, 'not JSON', missingMonthly, negativeUsed, stringUsed, missingLimit, nullUsed, negativeLimit]) {
    const result = await probe(body);
    assert.equal(result.status, 'unavailable');
    assert.equal(result.metrics.error, 'usage_response_invalid');
    assert.equal(result.metrics.dailyUsed, undefined);
  }
});

test('documented valid usage retains observed quota and warns at either 90% boundary', async () => {
  const healthy = await probe(usage());
  assert.equal(healthy.status, 'healthy');
  assert.equal(healthy.metrics.dailyUsed, 10);
  assert.equal(healthy.metrics.monthlyLimit, 3000);
  assert.equal(healthy.metrics.dailyRatio, 0.1);
  for (const [window, used] of [['daily', 90], ['monthly', 2700]]) {
    const body = usage(); body.emails[window].used = used;
    assert.equal((await probe(body)).status, 'degraded');
  }
});

test('uncapped daily quota stays null instead of being represented as zero', async () => {
  const body = usage(); body.emails.daily.limit = null;
  const result = await probe(body);
  assert.equal(result.status, 'healthy');
  assert.equal(result.metrics.dailyLimit, null);
  assert.equal(result.metrics.dailyRatio, null);
});

test('a zero email allowance is exhausted without producing a non-finite ratio', async () => {
  const body = usage(); body.emails.daily.used = 0; body.emails.daily.limit = 0;
  const result = await probe(body);
  assert.equal(result.status, 'degraded');
  assert.equal(result.metrics.dailyRatio, 1);
});

test('missing credentials and upstream service errors remain distinct', async () => {
  assert.equal((await probe(null, 200, null)).source, 'credential_required');
  assert.equal((await probe({ name: 'internal_server_error' }, 500)).status, 'unavailable');
});
