// Dedicated Cashfree TEST diagnostic Worker. Never import from the MLOS public
// Worker or Pages assets. No public routes, checkout, webhook or payment writes.
import {
  inspectCashfreeSandboxReadiness,
  createCashfreeSandboxService
} from '../src/adapters/cashfree-sandbox-bindings.js';

// Internal helper, callable by tests or manual, separately authorized scheduled
// dispatch. It never creates subscriptions or issues paid learner grants.
export async function inspectCashfreeStagingWorker(env = {}, { fetchImpl } = {}) {
  const status = inspectCashfreeSandboxReadiness(env);
  if (!status.configured) return Object.freeze({ outcome: 'disabled' });
  if (!status.appIdBindingPresent || !status.secretBindingPresent) {
    return Object.freeze({ outcome: 'missing_bindings' });
  }
  const mode = env.CASHFREE_SANDBOX_RUN_MODE;
  if (!['read_only', 'auth_probe'].includes(mode) ||
      env.CASHFREE_SANDBOX_NETWORK_TESTS_ENABLED !== 'true') {
    return Object.freeze({ outcome: 'bindings_present_network_disabled' });
  }
  // Read-only probe is isolated from subscription and mandate creation.
  // A 404 on a nonexistent plan is INCONCLUSIVE, not proof of authorization.
  if (mode === 'auth_probe') {
    if (typeof fetchImpl !== 'function') return Object.freeze({ outcome: 'no_transport' });
    try {
      const service = createCashfreeSandboxService(env, { fetchImpl });
      const receipt = await service.probeTestPlanAccess();
      return Object.freeze({ outcome: 'auth_probe_status', assessment: receipt.result,
        ...(receipt.result === 'transport_failed' ? { transportCategory: receipt.transportCategory } : {}) });
    } catch {
      return Object.freeze({ outcome: 'sandbox_request_failed' });
    }
  }
  // Only a previously created TEST subscription identifier can be inspected.
  // This worker never creates a subscription or requests an AutoPay mandate.
  const id = env.CASHFREE_SANDBOX_TEST_SUBSCRIPTION_ID;
  if (typeof id !== 'string' || !/^[A-Za-z0-9_.-]{1,80}$/.test(id)) {
    return Object.freeze({ outcome: 'test_subscription_id_required' });
  }
  if (typeof fetchImpl !== 'function') {
    return Object.freeze({ outcome: 'no_transport' });
  }
  try {
    const service = createCashfreeSandboxService(env, { fetchImpl });
    const result = await service.fetchTestSubscription(id);
    // Return no provider payload, IDs, credentials, or PII in logs.
    return Object.freeze({
      outcome: 'test_status_read',
      statusRecognized: ['ACTIVE', 'INITIALIZED', 'BANK_APPROVAL_PENDING', 'CANCELLED',
        'ON_HOLD', 'EXPIRED', 'COMPLETED'].includes(result.status)
    });
  } catch {
    // Fail closed: provider may return 401/403/404 or product unavailable.
    // Never infer successful authorization from a 404.
    return Object.freeze({ outcome: 'sandbox_request_failed' });
  }
}

export default {
  // Deny every HTTP method and path, including any URL on workers.dev.
  async fetch() {
    return new Response('Not found', {
      status: 404,
      headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
    });
  },
  // There are NO configured cron triggers. Future manual/controlled test
  // dispatch requires separate operator approval. Never schedule automatically.
  async scheduled(controller, env) {
    controller?.noRetry?.();
    const result = await inspectCashfreeStagingWorker(env, { fetchImpl: fetch });
    // Only coarse outcome categories, no secret names/values or subscription IDs.
    // Only controlled result enum values appear, never credentials or provider
    // response bodies. Observability remains disabled by default in Wrangler.
    if (result.outcome === 'auth_probe_status') {
      console.info('cashfree_sandbox_probe', result.outcome, result.assessment);
      if (result.assessment === 'transport_failed' &&
          ['type_error', 'error', 'unknown'].includes(result.transportCategory)) {
        console.info('cashfree_sandbox_transport', result.transportCategory);
      }
    } else {
      console.info('cashfree_sandbox_probe', result.outcome);
    }
  }
};
