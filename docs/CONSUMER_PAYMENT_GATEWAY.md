# Consumer payment gateway architecture: Cashfree primary, PhonePe alternative
**Decision:** owner-directed 2026-10-14. **Status:** Code preparation, not public payment activation.

## Source of truth
- **Cashfree Payments:** sole primary *candidate* for future consumer payments, with a server-only, disabled-by-default sandbox adapter in `src/adapters/cashfree-test.js`.
- **PhonePe PG:** backup *provider option*. No live adapter, account routing, live keys, automatic fallback, or duplicate subscription state exists.
- **Razorpay:** legacy preparation code removed from current tree. Previous commits remain accessible in Git history for audit, not ongoing use.
- Canonical consumer entitlement authority remains `src/domain/consumer-entitlements.js`; payment gateways cannot mutate learner progress, content, medical assertions, mastery estimates, private notes, or issue paid grants directly.
- Only consumer Free/Pro/AI Pro scope. Institutional B2B contracts, tenants, seat billing, marketplace and revenue shares are deferred.

## What's implemented
`src/domain/consumer-payment-providers.js` records the exact primary and backup preference, with all consumer charging, recurring billing and automatic failover explicitly disabled.

The isolated Cashfree test adapter provides:
1. `createCashfreeSandboxSubscription(input, config)`: requires `environment: 'sandbox'`, `sandboxEnabled: true`, opaque server-only test app credentials, explicit injected server transport, trusted-server UUID idempotency key, validated merchant subscription ID, required customer fields, INR MONTH 1/3/12 periodic plan, and optionally an HTTPS callback URL restricted to a configured origin. The destination is fixed to `https://sandbox.cashfree.com/pg/subscriptions`. It sends `x-client-id`, `x-client-secret`, `x-api-version: 2025-01-01`, `x-idempotency-key`; returns inert `subscription_id` and `subscription_session_id`. There is no checkout action.
2. `fetchCashfreeSandboxSubscription(subscriptionId, config)`: reads sandbox subscription state from `GET /pg/subscriptions/{subscription_id}`. An `ACTIVE` authorization or subscription status is only a provider snapshot; it does NOT extend learner entitlement.
3. `verifyCashfreeSandboxWebhook({ rawBody, signature, timestamp }, config)`: checks `x-webhook-signature` as Base64(HMAC-SHA256(secret, `x-webhook-timestamp` + unchanged raw body)); accepts only subscription event types and returns a verification receipt. No webhook endpoint and no event storage. This is deliberately distinct from Razorpay's hex signature.

These exports are not included in `scripts/public-surface.js`. No UI form or production service imports them. No company dashboard or credentials were accessed. The Cashfree client ID/secret may not have a reliable `test_` prefix, so test isolation relies on an explicit sandbox flag AND environment plus a hard-pinned sandbox hostname. Integration must still ensure credentials really are test-only.

## Future authenticated billing pipeline, NOT implemented
`MLOS plan price version -> trusted server-selected amount and learner -> checkout authorization -> signed raw webhook -> unique event inbox -> reconciliation with Cashfree subscription/payment API -> server-authoritative subscription ledger -> entitlement grant -> account lifecycle UI.`

Before exposing any payment route, require:
- Merchant KYC, Cashfree subscription enablement, test credentials and approved payment methods.
- Written pricing for ordinary UPI/card and each UPI AutoPay mandate and renewal, GST, settlement, refunds, failure retries and reversals. Promotions are not durable assumptions.
- Owner-reviewed public Pro/AI Pro pricing, renewal terms, cancellation/refund policies, taxes, consent and checkout disclosures.
- Durable, atomic deduplication with unique payment/attempt and delivery identifiers. Do not equate HMAC verification with idempotency or payment success.
- Model provider status, authorization status, payment collected, term expiry, refunds, cancellation, disputes and late/reordered webhooks separately. No access from browser redirect, mere mandate authorization, or provider dashboard state alone.
- Robust retries, dead-letter investigation, duplicate lifecycle event tests, and subscription continuity after connectivity failures.
- PWA payment UX tested on phone/iPad browsers; app-store billing requirements reviewed for actual native digital subscriptions. Avoid claiming native app store compliance solely because Cashfree/PhonePe have SDKs.
- Release flags independently scoped: sandbox access is not a production checkout flag. Secrets only in trusted server secret stores; never GitHub source, web bundle, logs, browser storage or learner event ledger.
- Content-readiness and verified learning loop gates remain active: post-reset approved catalog remains unpopulated until genuine polished PYQ intake, rights and clinical review.

## PhonePe contingency
A gateway outage should not cause automatic switching of existing AutoPay mandates to PhonePe. Use PhonePe only after merchant access, sandbox tests, written fees and explicit switch approval. New payments may then be routed by a server-side provider-neutral adapter; existing Cashfree mandates generally need cancellation/reenrollment or an explicitly supported regulated migration process. Never assume provider mandates are portable. Do not attempt automatic double-debit retries at two providers.

## Acceptance and authorization
The engineering change is **successful only when** old Razorpay source/test/doc are absent from the active tree, current Cashfree test files and gateway policy pass Node tests, the Pages public allowlist excludes server payment modules, and GitHub checks pass. Even a green CI is not Cashfree dashboard sandbox transaction evidence, a published payment endpoint, or authorization to collect actual funds.

Official documentation inspected 2026-10-14:
- Cashfree Create Subscription: https://www.cashfree.com/docs/api-reference/payments/latest/subscription/create-subscription
- Cashfree hosted Subscriptions checkout: https://www.cashfree.com/devstudio/preview/subs/web/checkout
- Cashfree Subscription Event Feed: https://www.cashfree.com/docs/api-reference/payments/latest/subscription/webhooks
- Cashfree signature background: https://www.cashfree.com/devstudio/preview/pg/tools/webhookVerification
- PhonePe PG documentation (verify applicable AutoPay API at activation): https://developer.phonepe.com/

## Engineering release receipt — 2026-10-14
Merged in [PR #240](https://github.com/mdmoazzam291/Medical_Learning_OS/pull/240) at `b7b19fc23b992a9daa92a9f6c23da11fc45b6344`. [Foundation run 38544793361](https://github.com/mdmoazzam291/Medical_Learning_OS/actions/runs/38544793361) reports check/browser/WebKit success. Main readback verified payment policy, Cashfree sandbox adapter and absence of Razorpay source. This proves repository regression tests passed, not real Cashfree API credentials, hosted PWA appearance, merchant onboarding or charges. Checkout remains disabled.

## 2026-10-14 Test credential readiness
Owner reports Test/Sandbox API keys have been generated. A separate server-only secret-binding bridge `src/adapters/cashfree-sandbox-bindings.js` with opt-in flags and Cloudflare Secrets Store compatibility is prepared. Current checkout, webhook, subscription ledger and premium grants remain disabled; credentials are **not connected** to deployed infrastructure. See [Cashfree sandbox secret setup](CASHFREE_SANDBOX_SECRET_SETUP.md).

## 2026-10-14 Secrets Store stored; isolated Worker design
Owner screenshots establish `CASHFREE_TEST_APP_ID` and `CASHFREE_TEST_SECRET_KEY` are saved as encrypted Cloudflare account secrets with Workers scope. Their scope status does not prove a deployed Worker binding. Separate `cloudflare/cashfree-sandbox-worker.js` and `wrangler.cashfree-sandbox.jsonc` explicitly isolate a no-route/no-cron staging Worker with network disabled by default. They are **not deployed** or wired to production. Details in [sandbox secret setup](CASHFREE_SANDBOX_SECRET_SETUP.md).

## 2026-10-15 read-only Cashfree API probe (no payment activation)
Cashfree Test UI confirms Subscriptions is navigable and no plans are displayed under the Last 30 days filter. A server-only GET probe against a deliberately nonexistent sandbox plan has been prepared in `docs/CASHFREE_READONLY_API_PROBE.md`, default-disabled with no public route or Cron. HTTP 404 cannot prove credentials or product authorization. Real Cashfree API call remains outstanding, with no payment/grant changes.
