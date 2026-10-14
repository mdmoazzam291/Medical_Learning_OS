import test from 'node:test';
import assert from 'node:assert/strict';
import { probeCashfreeSandboxPlanAccess } from '../src/adapters/cashfree-test.js';
import { createCashfreeSandboxService } from '../src/adapters/cashfree-sandbox-bindings.js';
import staging, { inspectCashfreeStagingWorker } from '../cloudflare/cashfree-sandbox-worker.js';
import { resolveConsumerAccess } from '../src/domain/consumer-entitlements.js';
import { publicFileSet } from '../scripts/public-surface.js';

const env = (extra={}) => ({
  CASHFREE_SANDBOX_MODE: 'sandbox',
  CASHFREE_SANDBOX_ENABLED: 'true',
  CASHFREE_SANDBOX_NETWORK_TESTS_ENABLED: 'false',
  CASHFREE_SANDBOX_RUN_MODE: 'disabled',
  CASHFREE_TEST_APP_ID: { async get(){ return 'mock-sandbox-client-id'; } },
  CASHFREE_TEST_SECRET_KEY: { async get(){ return 'mock-sandbox-secret-key'; } },
  ...extra
});
const cfg = fetchImpl => ({
  environment: 'sandbox', sandboxEnabled: true,
  clientId: 'mock-sandbox-client-id',clientSecret:'mock-sandbox-secret-key',fetchImpl
});
test('one read-only probe uses fixed Cashfree sandbox GET plan URL without creating anything', async () => {
  let calls = 0;
  const result = await probeCashfreeSandboxPlanAccess(cfg(async (url, init) => {
    calls++;
    assert.equal(url, 'https://sandbox.cashfree.com/pg/plans/mlos_nonexistent_auth_probe_20261015');
    assert.equal(init.method, 'GET');
    assert.equal(init.cache, 'no-store');
    assert.equal(init.redirect, 'error');
    assert.deepEqual(Object.keys(init.headers).sort(), ['Accept', 'x-api-version','x-client-id','x-client-secret']);
    assert.equal(init.headers['x-api-version'], '2025-01-01');
    assert.equal(init.body, undefined);
    return { status: 404, async json(){ throw new Error('must not read body'); } };
  }));
  assert.equal(calls, 1);
  assert.deepEqual(result,{provider:'cashfree',environment:'sandbox',result:'not_found_auth_inconclusive'});
  assert.equal(JSON.stringify(result).includes('mock-sandbox-secret-key'),false);
});
test('probe separates auth denial from inconclusive 404; no successful authentication claim', async () => {
  const statuses = [
    [200, 'unexpected_plan_found_investigate'],
    [400, 'bad_request_auth_inconclusive'],
    [401, 'unauthorized'],
    [403, 'forbidden_or_product_restricted'],
    [404, 'not_found_auth_inconclusive'],
    [422, 'bad_request_auth_inconclusive'],
    [429, 'rate_limited'],
    [503, 'provider_unavailable'],
    [302, 'other_response_auth_inconclusive']
  ];
  for(const [status,expected] of statuses) {
    const r=await probeCashfreeSandboxPlanAccess(cfg(async()=>({status})));
    assert.equal(r.result,expected);
    assert.equal(r.authenticated,undefined);
  }
  assert.equal((await probeCashfreeSandboxPlanAccess(cfg(async()=>{throw Error('sensitive remote credentials!')}))).result,'transport_failed');
});
test('probe rejects live mode, unset flags and missing credentials before network', async () => {
  let calls=0;
  const fetchImpl=()=>{calls++; throw Error('forbidden');};
  await assert.rejects(probeCashfreeSandboxPlanAccess({...cfg(fetchImpl),environment:'production'}),/sandbox_disabled/);
  await assert.rejects(probeCashfreeSandboxPlanAccess({...cfg(fetchImpl),sandboxEnabled:false}),/sandbox_disabled/);
  await assert.rejects(probeCashfreeSandboxPlanAccess({...cfg(fetchImpl),clientId:''}),/credentials_required/);
  assert.equal(calls,0);
});
test('sandbox auth-probe cannot run under deployed default flags, even with bindings', async()=>{
  let reads=0,calls=0;
  const e=env({
    CASHFREE_SANDBOX_RUN_MODE:'auth_probe',
    CASHFREE_TEST_APP_ID:{async get(){reads++;return 'mock-key-id-123';}},
    CASHFREE_TEST_SECRET_KEY:{async get(){reads++;return 'mock-key-secret';}}
  });
  assert.deepEqual(await inspectCashfreeStagingWorker(e,{fetchImpl:()=>{calls++;return {status:404};}}),{outcome:'bindings_present_network_disabled'});
  assert.equal(reads,0);
  assert.equal(calls,0);
  assert.equal(resolveConsumerAccess().plan,'free');
});
test('separately gated internal mode sends GET only; logs contain controlled result enums',async()=>{
  let reads=0,calls=0;
  const e=env({
    CASHFREE_SANDBOX_NETWORK_TESTS_ENABLED:'true',
    CASHFREE_SANDBOX_RUN_MODE:'auth_probe',
    CASHFREE_TEST_APP_ID:{async get(){reads++;return 'mock-client-id-123';}},
    CASHFREE_TEST_SECRET_KEY:{async get(){reads++;return 'mock-secret-value-123';}}
  });
  const fetchImpl=async(url,init)=>{
    calls++;
    assert.equal(init.method,'GET');
    assert.equal(url,'https://sandbox.cashfree.com/pg/plans/mlos_nonexistent_auth_probe_20261015');
    return {status:403,async text(){throw Error('never read response text')}};
  };
  const result=await inspectCashfreeStagingWorker(e,{fetchImpl});
  assert.deepEqual(result,{outcome:'auth_probe_status',assessment:'forbidden_or_product_restricted'});
  assert.equal(reads,2);
  assert.equal(calls,1);
  assert.equal(JSON.stringify(result).includes('mock-secret-value-123'),false);
  assert.equal(resolveConsumerAccess().plan,'free');
  // Never invoke the live scheduled() handler while the test network flag is
  // enabled. CI unit tests must use injected mock transport only.
  assert.equal(publicFileSet.has('cloudflare/cashfree-sandbox-worker.js'),false);
});
test('sandbox service is disabled without network flag even if its direct probe method is called',async()=>{
  const svc=createCashfreeSandboxService(env(),{fetchImpl:()=>{throw Error('unexpected call')}});
  await assert.rejects(svc.probeTestPlanAccess(),/network_tests_disabled/);
  const res=await staging.fetch(new Request('https://example.invalid/diagnostic'));
  assert.equal(res.status,404);
});
