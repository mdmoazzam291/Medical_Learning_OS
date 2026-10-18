# Production billing readiness — 18 October 2026

Scope: Medical_Learning_OS only. Source audited at
`e46b3cc1cb6d42025e576f7a5a0047e150f39392`.
Owner authorized production preparation, keeping customer charging disabled.
The repeated fake-plan probe is paused; it is not the definition of a tested
checkout, and no new token or provider request is required for this audit.

## Verified source inventory

| Area | Evidence | Actual readiness |
|---|---|---|
| Provider choice / kill switch | `src/domain/consumer-payment-providers.js` | Cashfree primary; checkout and recurring flags false |
| Production API adapter | `src/adapters/cashfree-production.js` | Hosted session creation and subscription read functions exist; independent default-off release gates, fixed host, redirects not followed; not called by a deployed billing endpoint |
| Private ledger schema | `20261016120000_consumer_billing_foundation.sql` | Five tables and RLS/no client policies defined; prior handoff records application, not independently rechecked in live DB today |
| Reservation metadata | `20261016130000_consumer_billing_reservations.sql` | Offer amount/version, consent/terms, unique environment/idempotency index defined; atomic reservation operation not implemented |
| Entitlement preflight | `src/domain/consumer-billing-eligibility.js` | Pure checks on trusted objects; cannot authenticate a payment, fetch evidence, transact or grant access |
| Webhook primitive | `src/adapters/cashfree-test.js` | TEST-only raw-body HMAC helper exists; not a production webhook inbox/handler/reconciler |
| Existing HTTP surfaces | `scripts/api.js`, `cloudflare/edge-worker.js`, `supabase/functions/` | No connected Cashfree checkout or payment reconciliation endpoint found |
| Learner offer | Existing consumer plans preview | Checkout disabled; proposed prices/terms not owner-approved by this preparation instruction |

Local source/tests cannot prove merchant activation, live secrets, production
payment methods, actual SQL deployment, account permissions or completed charges.
No such account inspection or production API call was made in this audit.

## Latest sandbox evidence (supersedes older two-attempt summaries)

| Run | Observed result | Limit |
|---|---|---|
| 38827800192 | Local scheduled trigger404 | No verified provider response |
| 38830783379 | `transport_failed` | Exception cause discarded; authentication unknown |
| 38902120043 | `unauthorized` | HTTP401; not valid authentication |
| 39128032212 | `bad_request_auth_inconclusive` | HTTP400 OR422; exact status/error body discarded |

The owner reported updating both stored TEST values from one Payment Gateway
TEST pair before the fourth run. The owner confirmed deleting that run's temporary
Cloudflare token and GitHub Actions secret afterward. Actual values and deletion
were not read by the assistant. Preserve those updated TEST secrets and bindings.
The latest changed response is not proof of accepted keys or product access.

## Recommended next backend slice (proposed design, not implemented)

Build authenticated checkout and durable reservation as the first slice. Keep
payment grant writes absent until a separately verified reconciliation slice.
This is a new server subsystem, not a flag change in the existing transport.

1. Server verifies learner identity; never use a browser-supplied subject or
   service-role key in the browser. Reject unauthenticated/cross-user requests.
2. Client sends an offer identifier, accepted terms version and an idempotency
   key. Server loads the effective, approved price/terms and trusted customer
   details. Reject retired, future, changed or unapproved offers. Amount, currency,
   interval, provider IDs and return destination cannot be supplied as authority
   by the client.
3. A private database operation atomically reserves immutable subject, environment,
   offer/price/terms snapshot and provider subscription ID. Bind idempotency to
   subject + request fingerprint; reject conflicts. Concurrent identical calls
   must acquire at most one dispatch claim.
4. Call the correct environment adapter only after reservation commit and all
   launch gates. Do not hold a DB transaction across a provider network call.
   Timeout or ambiguous provider outcome becomes reconciliation-required; do not
   blindly repeat creation. Future recovery must reuse the same stable identity
   and respect Cashfree's documented idempotency behavior.
5. Persist only the server-side session receipt. Return hosted session details
   to its owning learner without credentials. Session/redirect/mandate status
   never grants paid access.
6. Keep deployment wiring and public purchase buttons off. Test identity rejection,
   price spoofing, consent/version mismatch, concurrency, duplicates, crash windows,
   timeout ambiguity, persistence failure and zero grant writes before release.

A separate billing Worker can retain encrypted credentials at Cloudflare and
preserve the existing public edge Worker and TEST diagnostic Worker. A Supabase
Edge Function is an alternative with existing server/auth conventions, but would
require separately provisioning server secrets there. Select and review the host
before writing deployment-specific routes or copying any credentials. This audit
recommends the isolated Worker for credential separation; it does not create one.

## Subsequent required slices

- Signed production raw webhook inbox with timestamp/replay policy and durable
  deduplication; reject malformed/unverified payloads before persistence.
- Payment-level provider verification and atomic state/grant reconciliation.
  Test duplicate, reordered and concurrent events, wrong amounts/subjects,
  refunds/reversals, failed renewals and expiry. Authorization alone is insufficient.
- Account-linked manage/cancel, invoices, truthful feature availability, renewal
  price/tax/consent/refund disclosures, observability and a tested kill switch.
- Real sandbox hosted checkout/payment lifecycle, then separately approved controlled
  production smoke transaction and cancellation/reversal checks before public release.

## External facts the owner must supply

First: Cashfree Production dashboard evidence of merchant/KYC status and whether
Subscriptions is enabled or shows activation required. A TEST menu is insufficient.
A screenshot must omit keys, bank details and personal documents.

Later, before paid checkout: approve final prices/terms, confirm the capabilities
actually sold, approve secure production credential provisioning and controlled
real-money testing. Do not ask for a new Cloudflare API token during this audit.

## Official references checked

- Hosted subscriptions: https://www.cashfree.com/devstudio/preview/subs/web/checkout
- Fetch Plan: https://www.cashfree.com/docs/api-reference/payments/latest/subscription/fetch-plan
- Subscription errors: https://www.cashfree.com/docs/api-reference/payments/latest/subscription/error-codes
- API testing: https://www.cashfree.com/docs/api-reference/api-best-practices

Latest docs show2026-01-01, while existing code pins2025-01-01. No evidence in the
sanitized fourth run establishes version_invalid; do not silently upgrade or
assert that a version switch fixes it. Reconfirm exact contracts before live use.
