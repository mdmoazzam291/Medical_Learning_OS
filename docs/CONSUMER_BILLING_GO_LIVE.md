# Consumer subscriptions: production go-live delivery plan

**Decision (owner, 2026-10-16):** Complete and eventually launch **consumer** subscriptions before expanding Medical Learning OS into other commercial initiatives. Cashfree remains primary; PhonePe is a deferred backup. This supersedes the previous preference to defer all payment engineering until more PYQ content arrives. It does **not** waive truthful-offer, medical content rights, merchant authorization, security, or financial safety requirements.

## Current verified engineering state
- The existing Free / Pro / AI Pro plans page is preview-only and public checkout buttons are disabled.
- The present app's Cloudflare public Worker is a static/edge gateway. There is no authenticated production subscription checkout/API or production payment ledger integrated into it.
- Cashfree TEST secrets belong only to the separate `mlos-cashfree-sandbox` Worker. Do not copy TEST or live credentials to the public Worker, GitHub, browser or client bundle.
- Two owner-triggered read-only sandbox attempts occurred: #38827800192 local trigger 404; #38830783379 outbound `transport_failed`. Neither verifies Cashfree credentials, Subscriptions merchant permissions or a working checkout.
- The user later confirmed deleting the temporary Cloudflare Actions token and its GitHub Actions secret, though administrative readback is unavailable.
- Cashfree documents a hosted checkout based on `subscription_session_id`, and production API access differs from sandbox. Do not choose seamless/S2S until Cashfree specifically grants its required permission.

## Build order — no shortcuts to real money
1. **Foundation (this PR):** private, RLS-locked offer/subscription/payment/webhook inbox/grant SQL schema, provider environment namespaces, matching-evidence paid-term eligibility preflight. This is source control only: no schema deploy, no product route, no active price row, no grant.
2. **Provider and merchant evidence:** independently verify actual Cashfree sandbox read/write API on an account-approved synthetic customer. Resolve `transport_failed` without blind reruns. Confirm merchant production KYC, subscription product entitlement, UPI AutoPay/card availability, settlement fees, recurring terms, refunds, disputes, relevant taxes and permissions.
3. **Checkout API:** standalone **server-authenticated** billing service, not a browser-imported adapter. Trusted pricing table and learner identity; idempotent subscription creation; fixed environment-specific Cashfree host, no redirects forwarding keys, no arbitrary client amount, explicit checkout audit. Start in sandbox only. Hosted checkout client uses session ID, not secret credentials.
4. **Durable webhook + reconciliation:** raw-body signature verification, idempotent event inbox, payment-specific receipt and amount/subject/offer matching, provider-fetch settlement/collection verification, atomic renewal/expiry/cancellation/reversal; signed event alone never grants access. Implement and test transaction boundaries against real Supabase test database, including duplicates, reordered deliveries and concurrent renewals.
5. **Learner UX:** show final price, tax/renewal interval, consent, cancellation/refund policy, current subscription, invoices and cancellation management. Browser redirect and UPI mandate authorization are pending status only. Personal notes/learning evidence remain portable on expiry.
6. **Launch controlled gate:** owner-approved **final pricing and terms**, Cashfree production keys in separate encrypted binding, production callbacks/domain approved, reconciliation and monitoring tested, successful real-money smoke purchase and reversal/cancellation test with explicit owner approval. Activate paid buttons and server policy only after all gates pass; install a kill switch.
7. **After launch:** webhook failure alerting, charge success vs entitlement discrepancy monitors, support workflow, privacy retention and accounting/settlement reconciliation. PhonePe remains unconnected unless independently approved.

## Owner decisions needed before actually accepting money
- Confirm commercial entity and Cashfree **Production Subscriptions enabled**, full merchant KYC/settlement verified, production API scope and allowed payment methods. Dashboard TEST accessibility is insufficient.
- Approve or revise the **proposed** GST-inclusive offers (not automatically approved by asking to prioritize subscriptions):
  - Pro: INR 499 month, 1,399 quarter, 3,999 year.
  - AI Pro: INR 899 month, 2,499 quarter, 6,999 year.
- Provide public billing, cancellation, refunds, taxes and recurring mandate consent language; verify business identity, contact and address for legally required disclosures.
- Decide whether to launch **monthly first** (recommended to reduce initial renewal/UPI AutoPay failure cases) or all intervals at once.
- Confirm the actually **available** software/features sold. Do not advertise “full licensed PYQ QBank” while the owner-supplied post-reset approved catalog is empty. A limited paid features offering is possible only if what is being sold is real and the value/terms are truthful.

## Foundation data model (this PR)
`supabase/migrations/20261016120000_consumer_billing_foundation.sql` creates five privately accessible tables:
`consumer_billing_offers` (draft-only until approved),
`consumer_billing_subscriptions`,
`consumer_billing_payments`,
`consumer_billing_webhook_inbox` (deduped raw-body digest, no raw PII payload),
`consumer_billing_grants` (reference to server-verified payment).
All tables have RLS enabled and SELECT/INSERT/UPDATE/DELETE revoked for `public`, `anon`, `authenticated`. No browser policies exist. Schema migration has not been applied; future service role must be scoped carefully. This foundation by itself **does not provide server atomicity**, reconcile events or establish Cashfree authenticity; it must never be used to mark a subscription live.

`src/domain/consumer-billing-eligibility.js` is a pure **server-only preflight** checking environment=production, approved offer, exact price and subject match, authorized active subscription, matching payment and a fresh provider-fetched success. It cannot validate the authenticity of caller-supplied JS objects or write a grant. Treat it as a secondary invariant inside an authenticated reconciler, never as a paid-access API or UI check.

## Stop/go acceptance (all required before live buttons)
- [ ] Merchant production Subscriptions approved and documented
- [ ] Final price catalog and recurring/refund policy approved
- [ ] Licensed/truthful sold capabilities genuinely available
- [ ] Real Cashfree sandbox auth, hosted checkout, mandate test, recurring payment reconciliation successful
- [ ] Signed webhook verification, deduplication, refunds, cancellation, expiration, out-of-order delivery tests
- [ ] Server-only billing endpoints and authenticated user identity
- [ ] SQL schema applied via reviewed migration + isolation/RLS DB tests
- [ ] Secure production API keys + live webhook configured (never paste into ChatGPT or GitHub files)
- [ ] Exactly one owner-approved low-risk real payment smoke test, then verified receipt/entitlement
- [ ] Kill switch, metrics and support/invoices ready
- [ ] Final explicit production charging activation

**References:** Cashfree hosted Subscriptions flow at https://www.cashfree.com/devstudio/preview/subs/web/checkout, production API docs at https://www.cashfree.com/docs/api-reference/payments/latest/subscription/create-subscription, Cashfree webhook signature reference at https://www.cashfree.com/devstudio/preview/pg/tools/webhookVerification, current strategy at `docs/CONSUMER_COMMERCIAL_PLAN.md`.
