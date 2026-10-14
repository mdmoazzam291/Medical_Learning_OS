# Razorpay sandbox preparation: DISABLED (2026-10-14)

This is a **non-deployed adapter**, not a working customer checkout or a payment service. No transactions, API keys, dashboard plans, webhook endpoint, mandate, real subscription or entitlement mutation were created. It is intentionally server-only, not included in the public Pages allowlist.

## Test-only boundary

`src/adapters/razorpay-test.js` exposes two independent helpers:
- `createRazorpayTestSubscription(input, { sandboxEnabled, keyId, keySecret, fetchImpl })`. Requires an explicit true flag, `rzp_test_` key, server-supplied secret, validated plan ID and billing count, explicit trusted network transport; sends to the fixed Razorpay `POST /v1/subscriptions`. Returns an inert TEST subscription reference, not access.
- `verifyRazorpayTestWebhook({ rawBody, signature, eventId }, { sandboxEnabled, webhookSecret })`. HMAC-SHA256 verifies exact **raw** webhook bytes against `X-Razorpay-Signature`, validates `x-razorpay-event-id` format and returns an inert verified event receipt. No event database or authorization logic is inside this helper.

Required future work BEFORE attaching a route or enabling sandbox: backend authentication, server-derived plan mapping to Razorpay test plan IDs, explicit sandbox environment secrets (never client keys), replay/duplicate prevention with transactional unique event IDs, ordered subscription state machine tolerant of out-of-order delivery, cancellation/refund/dispute handling, billing records, tax/mandate flow, tests in a non-production backend, and lifecycle account UI. Browser callback data is never trusted as payment evidence. A verified HMAC only authenticates origin, NOT a paid subscription grant; reconcile authoritative subscription/payment state first.

**Permanent release boundary:** no live keys, no production checkout, no customer debits, no webhook-driven grants, no institutional access. Go-live requires a fresh explicit authorization, actual published content and verified learning-flow readiness.

Official references (reverify before real activation):
- https://razorpay.com/docs/payments/subscriptions/test/
- https://razorpay.com/docs/api/payments/subscriptions/
- https://razorpay.com/docs/webhooks/validate-test/
