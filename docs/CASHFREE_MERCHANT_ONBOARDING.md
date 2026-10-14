# Cashfree merchant onboarding and sandbox credential checklist

**Checked:** 2026-10-14, Asia/Kolkata  
**Scope:** Medical Learning OS consumer subscriptions only.  
**Status:** **EXTERNAL MERCHANT ACTION REQUIRED**. A real Cashfree merchant account, KYC, test credentials and enabled Subscriptions product have **not been verified or created** in this repository workflow. Do not state onboarding is complete.

## Verified pathway
1. The account owner registers or logs in at Cashfree's official merchant site: https://merchant.cashfree.com/merchants/signup
2. The owner, not an AI assistant, accepts Cashfree's terms, confirms mailbox/OTP, chooses a genuinely applicable legal business type, and submits accurate legal/business, beneficiary and banking KYC data. Never fabricate a registration, GSTIN, PAN, ownership or bank account.
3. In the Merchant Dashboard, switch to **Test** environment and navigate to **Developers / API Keys** (labels may change). Generate/retrieve **Test App ID (client ID)** and **Test Secret Key**. Confirm **Subscriptions / UPI AutoPay** product access; ordinary PG test keys by themselves do not prove the recurring product is enabled.
4. Store secret values **only in an owner-controlled encrypted secret manager or the trusted backend's sandbox secret store**, not ChatGPT chat, screenshots, GitHub commits/issues/PRs, Google Drive documents, client bundles, analytics, logs or public configuration.
5. Later, connect server-only Cashfree sandbox credentials to the existing `src/adapters/cashfree-test.js` through an explicitly approved backend test harness. The adapter hard-pins `https://sandbox.cashfree.com` and requires sandbox flags. It currently has no deployed endpoint, subscription database, merchant keys or checkout.
6. Run sandbox subscription lifecycle tests separately. Verification of webhook authenticity is not enough: require idempotency and trusted provider reconciliation before a consumer entitlement can ever change.
7. Cashfree production merchant approval and the MLOS owner go-live authorization are **two distinct gates**. Neither may be inferred from availability of sandbox keys.

Cashfree says test credentials are available immediately after merchant signup. Production approval depends on actual KYC and website review, and Cashfree's published timelines are estimates, not guaranteed.

## Honest onboarding description, for owner review

**Proposed wording, not an assertion of incorporation or business registrations:**

> Medical Learning OS is an online medical education and examination-preparation software platform for medical students and doctors in India. It provides adaptive revision, personal notes, question practice, exam simulation and learning analytics, with additional AI-supported teaching features planned. Consumer subscriptions (Free, Pro, AI Pro) are intended for the website/PWA. The current beta does not accept customer subscription payments. No patient diagnosis, direct clinical care or medical consultation is sold through these plans.

Use only the actual operating brand and legal entity accepted by the owner. Describe which functions are **currently available** rather than advertising unreviewed premium content. Do not claim accreditation, government affiliation, official exam questions or medical licensure.

## Owner-only facts / evidence still required

| Item | Status / rule |
|---|---|
| Merchant account existence and verified business email | **Not confirmed**. Gmail lookup found no Cashfree onboarding/account message (only repository notification). |
| Authorized account holder and business type | **Owner input required**. Individual, sole proprietorship, registered company, etc must match actual records. |
| Legal entity name, PAN, business registration, applicable GST registration | **Owner/KYC**. Do not place IDs in this repository. |
| Settlement account and beneficiary-name matching | **Owner/bank/KYC**. Never commit account number or IFSC plus identifying documents. |
| Public merchant website URL | **Must be owner-verified**. Repository has a Plans preview page; hosted domain and merchant readiness not independently verified. |
| Business contact/support address and telephone | **Owner approval required**; a support email address alone does not satisfy every merchant review. |
| Terms of Service, Privacy Notice, Refund & Cancellation Policy, contact page | **Public publishing remains unverified**. Repo `docs/PRIVACY.md` is an internal erasure contract, not a customer-facing notice. As of the review, dedicated public legal pages were not in `scripts/public-surface.js`. |
| Pricing disclosure, GST, AutoPay consent/cancellation terms | **Not approved or published**; Pro/AI Pro pricing is only hypothetical. |
| Sandbox client ID, secret, recurring product permission | **Not obtained/verified**; must come from authenticated merchant dashboard. |
| Merchant fee quotation (regular UPI/card, AutoPay mandate/debit, refunds, GST, settlement) | **Pending written provider confirmation**; advertised temporary fee promotions must not be used as stable assumptions. |

## Current MLOS engineering boundaries

- `src/domain/consumer-payment-providers.js`: Cashfree primary, PhonePe documented alternative, production checkout/recurring and automatic failover disabled.
- `src/domain/consumer-entitlements.js`: Free/Pro/AI Pro only, premium disabled by default and no external payment-derived grant issuance.
- `src/adapters/cashfree-test.js`: server-only test adapter, absent from public Pages build. Its request/verifier tests run without any real merchant API calls.
- `web/plans.html`: proposed-plan comparison only; premium purchase controls remain disabled.
- Institution contracts, seats, tenant payments and marketplace remain deferred.

## Critical merchant website readiness gate

Before *requesting production activation*, ensure a reachable public URL explains who operates the service and how customers obtain support. Publish owner-reviewed **Terms**, **Privacy Notice**, **Refund/Cancellation**, **Contact** and subscription renewal disclosures. Confirm the privacy notice describes actual retained learner data and third-party processors; the internal privacy technical contract does not replace legal notice. Avoid publishing placeholder phone numbers, unowned addresses or speculative refund promises.

No patient data, learner study evidence, raw financial credentials or government identity scans should be stored in public project documents.

## Sources and reference links (verified 2026-10-14)

- Cashfree merchant signup: https://merchant.cashfree.com/merchants/signup
- Cashfree official signup/onboarding overview: https://www.cashfree.com/
- Cashfree merchant account/website requirements: https://www.cashfree.com/blog/merchant-onboarding-process/
- Cashfree payment site testing/preflight: https://www.cashfree.com/blog/test-cases-for-payment-gateway/
- Cashfree recurring subscription checkout: https://www.cashfree.com/devstudio/preview/subs/web/checkout
- Cashfree merchant support: https://www.cashfree.com/contact-us/
- Cashfree optional KYC fee terms for some unregistered GST merchants: https://www.cashfree.com/fee-tnc/

**Next external action:** account owner opens the official Cashfree signup/dashboard and completes real registration or signs into an existing account. After obtaining test credentials **in the dashboard**, the owner confirms only that the Test environment and Subscriptions product are enabled. The secret values must remain outside chat and source control. No checkout go-live is authorized.
