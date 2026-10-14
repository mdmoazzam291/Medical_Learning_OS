// Secure server-only entrypoint for Cashfree TEST credentials attached through
// Cloudflare Workers' Secrets or Secrets Store bindings. This module is not part
// of scripts/public-surface.js and must NEVER be imported by browser code.
import {
  createCashfreeSandboxSubscription,
  fetchCashfreeSandboxSubscription,
  verifyCashfreeSandboxWebhook
} from './cashfree-test.js';
import { CONSUMER_PAYMENT_PROVIDER_POLICY } from '../domain/consumer-payment-providers.js';

const SECRET_NAMES = Object.freeze({
  appId: 'CASHFREE_TEST_APP_ID',
  secretKey: 'CASHFREE_TEST_SECRET_KEY',
  webhookSecret: 'CASHFREE_TEST_WEBHOOK_SECRET'
});
export const CASHFREE_SANDBOX_BINDING_NAMES = SECRET_NAMES;

// Only a private server operator can change these (not an inbound request or
// client-controlled variable). Two independent flags prevent accidental calls.
function sandboxConfigured(env) {
  return env?.CASHFREE_SANDBOX_MODE === 'sandbox' &&
    env?.CASHFREE_SANDBOX_ENABLED === 'true' &&
    CONSUMER_PAYMENT_PROVIDER_POLICY.primary === 'cashfree' &&
    CONSUMER_PAYMENT_PROVIDER_POLICY.productionCheckoutEnabled === false &&
    CONSUMER_PAYMENT_PROVIDER_POLICY.recurringBillingEnabled === false;
}
function bindingPresent(binding) {
  return typeof binding === 'string' ? binding.length > 0 :
    Boolean(binding && typeof binding.get === 'function');
}

// No secrets ever returned in the status object.
export function inspectCashfreeSandboxReadiness(env = {}) {
  const enabled = sandboxConfigured(env);
  return Object.freeze({
    provider: 'cashfree',
    environment: 'sandbox',
    configured: enabled,
    appIdBindingPresent: bindingPresent(env?.[SECRET_NAMES.appId]),
    secretBindingPresent: bindingPresent(env?.[SECRET_NAMES.secretKey]),
    webhookBindingPresent: bindingPresent(env?.[SECRET_NAMES.webhookSecret]),
    networkTestsEnabled: enabled && env?.CASHFREE_SANDBOX_NETWORK_TESTS_ENABLED === 'true',
    productionCheckoutEnabled: false,
    grantsEnabled: false
  });
}
async function secretValue(env, key) {
  const value = env[key];
  const resolved = typeof value === 'string' ? value :
    value && typeof value.get === 'function' ? await value.get() : null;
  if (typeof resolved !== 'string' || resolved.trim().length < 8) {
    // No part of the secret value or provider response belongs in errors/logs.
    throw new Error('cashfree_sandbox_secret_unavailable');
  }
  return resolved;
}
function checkBase(env) {
  if (!sandboxConfigured(env)) throw new Error('cashfree_sandbox_disabled');
}
function checkNetwork(env) {
  checkBase(env);
  if (env.CASHFREE_SANDBOX_NETWORK_TESTS_ENABLED !== 'true') {
    throw new Error('cashfree_sandbox_network_tests_disabled');
  }
}
function trustedTransport(fetchImpl) {
  if (typeof fetchImpl !== 'function') {
    throw new TypeError('cashfree_sandbox_server_transport_required');
  }
  return fetchImpl;
}

async function subscriptionConfig(env, fetchImpl) {
  checkNetwork(env);
  trustedTransport(fetchImpl);
  const [clientId, clientSecret] = await Promise.all([
    secretValue(env, SECRET_NAMES.appId),
    secretValue(env, SECRET_NAMES.secretKey)
  ]);
  return {
    environment: 'sandbox', sandboxEnabled: true,
    clientId, clientSecret, fetchImpl,
    allowedReturnOrigin: env.CASHFREE_SANDBOX_RETURN_ORIGIN
  };
}

// Caller is an internal, trusted harness; NO HTTP endpoint or route is provided.
// Even when the harness is explicitly enabled, test-only API responses never
// mutate a learner subscription, paid entitlement or actual charging state.
export function createCashfreeSandboxService(env = {}, { fetchImpl } = {}) {
  checkBase(env);
  return Object.freeze({
    async createTestSubscription(trustedInput) {
      const config = await subscriptionConfig(env, fetchImpl);
      return createCashfreeSandboxSubscription(trustedInput, config);
    },
    async fetchTestSubscription(subscriptionId) {
      const config = await subscriptionConfig(env, fetchImpl);
      return fetchCashfreeSandboxSubscription(subscriptionId, config);
    },
    async verifyTestWebhook({ rawBody, signature, timestamp } = {}) {
      checkBase(env);
      const webhookSecret = await secretValue(env, SECRET_NAMES.webhookSecret);
      return verifyCashfreeSandboxWebhook({ rawBody, signature, timestamp },
        { environment: 'sandbox', sandboxEnabled: true, webhookSecret });
    }
  });
}
