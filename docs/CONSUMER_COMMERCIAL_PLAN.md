# Consumer commercial scope and entitlement policy
**Updated:** 2026-10-14  
**Status:** Owner-directed planning; **no pricing approval or payments live**.

## Current decision
- Work only on **Free OS, Pro, and AI Pro** consumer access.
- The proposed institutional model remains **deferred**. No tenant billing, seat assignment, institution/faculty access, institutional analytics, procurement, revenue sharing, marketplace, or white-label implementation is authorized by this plan.
- Private complete pricing and economic assumptions are kept outside this **public** repository in the project's private Google Drive `00_Governance` directory, under *MLOS Commercial Strategy v1.1 | Consumer Active, Institution Deferred | 2026-10-14*. This public contract deliberately omits internal financial projections and detailed B2B sales strategy.
- The consumer plan is **not** approved for selling absent verified rights-cleared content, working learning loop, secure checkout, and explicit go-live authorization. No existing question content, rights gates, or release requirements are changed.

## Consumer entitlements (desired contract, not implementation claim)
| Consumer tier | Product contract |
| --- | --- |
| Free forever | Own notes/annotations/exports and basic Graph, Study Now, mistake logging, memory scheduling, access to limited actual reviewed content |
| Pro | Full **available, rights-cleared** premium practice catalog, supported simulations, adaptive study/revision and analytics where validated, affordable AI assistance |
| AI Pro | Pro plus expanded source-grounded individualized tutoring, optional multimodal/case reasoning and published fair-use limits |

NEET-PG and INI-CET are a shared Indian consumer exam bundle. Premium availability must be capability-level, not based on route visibility; show truthful unavailable states if content is not published. Learner history, private notes and export do not vanish on downgrade/expiry.

## Consumer pricing proposal (INR, GST-inclusive; unapproved)
- Pro: ₹499 month / ₹1,399 quarter / ₹3,999 year.
- AI Pro: ₹899 month / ₹2,499 quarter / ₹6,999 year.
- Founding cohort prices may be tested only after product gates and fresh owner go-live approval. Pricing and payment-provider fees are not constants in domain code.

## Implementation order
1. **Foundation only:** versioned plan catalog/price catalog design, capability entitlements, grant precedence (paid, free, trial, scholarship), deterministic authorization checks, expiry/downgrade portability tests. Keep admin authorization orthogonal.
2. **Learning gates:** user can complete Study Now → reviewed question → answer → explanation → error/memory update → delayed retest; genuine reviewed source/rights-cleared content available and learning lift investigated. Current post-reset PYQ intake/review remains the primary content dependency.
3. **Payment integration after gate:** a vendor-neutral gateway boundary; signed webhook verification, idempotent event inbox, server-authoritative transactions, subscription state, entitlements, invoices, refunds/cancellation, retries, user controls, tax/mandate validation. The browser checkout result is never proof of payment.
4. **Launch:** explicit final prices/terms, sandbox payment lifecycle tests, audited activation/revocation, acceptable unit economics and an owner's production charging decision. AI Pro additionally needs compute-budget tests and demonstrated incremental educational value.

## Scope exclusions
No institutional roles/data tables, multi-tenant billing, institutional sale workflows, public marketplace, revenue-sharing agreements, live gateway keys, checkout pages, production payment activation, or unverified medical claims should be introduced merely by documenting this proposal.

## System boundaries
The billing domain can issue **entitlement grants**; it cannot modify medical truth, question scoring, immutable learner evidence or Digital Twin probabilities. Providers (Cashfree/PhonePe/other) are replaceable adapters. A future institution grant may be modeled via general grant provenance but no institution functionality is being built now.

## Implementation acceptance checklist
- [ ] Business price/feature matrix re-approved for each launch stage
- [ ] Access grants tested for Free/Pro/AI Pro/expiry/revocation
- [ ] No purchase grants access without verified backend payment event
- [ ] No impact on learner data portability, admin roles, question review, or core study progression
- [ ] No paid full-QBank claim before catalog actually exists
- [ ] No public charging without separately authorized release
- [ ] Institutional work remains frozen

## 2026-10-14 implementation checkpoint (pending independent verification)
- Q1: Added pure `src/domain/consumer-entitlements.js` (unreleased capabilities/price proposals, server-grant-only evaluation, Free default), plus focused tests.
- Q2: Added `/web/plans.html` as responsive preview-only pricing surface using current permanent palettes, no live checkout; Account menu link, public Pages allowlist and route ownership updated.
- Q3: Added default-disabled, non-public `src/adapters/razorpay-test.js` for Razorpay test-key subscription request and HMAC-signed raw webhook verification; no endpoints, secrets, charge, mandate, DB grants or production activation.
- No institution work. Full CI/browser acceptance and genuine trusted-server entitlement integration remain pending; content gates are unchanged.

## Release receipt (2026-10-14)
Q1/Q2/Q3 foundation merged in [PR #238](https://github.com/mdmoazzam291/Medical_Learning_OS/pull/238) (`e5523ab2833e38da729440067057ea3846fe6c41`). Foundation run 38540502563 passed Node/check/build, Chromium and WebKit. This means code and preview design are in main; it does **not** mean an active subscription, tested Razorpay transaction or verified hosted deployment. Premium release remains OFF and institution scope remains frozen.

## 2026-10-14 owner gateway selection (current, overrides older implementation receipt)
**Cashfree primary** for consumer sandbox integration, **PhonePe alternative** (design only), **Razorpay retired** from the active repository. The old Q3 Razorpay implementation note above is historical. See [active gateway contract](CONSUMER_PAYMENT_GATEWAY.md) and ADR-116. No checkout, recurring mandate, merchant credentials, actual grant or production charging is enabled. Institution strategy stays deferred.
