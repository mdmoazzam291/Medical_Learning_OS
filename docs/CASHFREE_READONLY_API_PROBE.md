# Cashfree read-only sandbox API probe
**Prepared:** 2026-10-15 (Asia/Kolkata)  
**Owner scope:** Consumer billing only. All actual payment operations, checkout, subscriptions, UPI AutoPay, live keys, and paid grants remain disabled.

## What we know
- Cashfree merchant UI in **Test Environment** shows Subscriptions > All Subscriptions and All Plans. Owner's All Plans screenshot shows “No Plans Found” in a **Last 30 days** filter. This confirms UI navigation, not API merchant/product authorization.
- The `mlos-cashfree-sandbox` Cloudflare Worker is deployed and both encrypted TEST Secrets Store bindings are present. It has no public route and no automatic cron. Its four vars remain `sandbox`, `false`, `false`, `disabled`.
- The dedicated Worker configuration `wrangler.cashfree-sandbox.jsonc` carries only store metadata; no secret values in GitHub.
- Actual remote Cashfree API authentication has **not** been tested. This PR does **not** execute any real merchant request.

## What this PR implements
A strictly read-only internal path:
`cloudflare/cashfree-sandbox-worker.js` -> `src/adapters/cashfree-sandbox-bindings.js` -> `src/adapters/cashfree-test.js`.
The code can issue **one GET** to Cashfree's published sandbox Plan endpoint:
`https://sandbox.cashfree.com/pg/plans/mlos_nonexistent_auth_probe_20261015`
with `x-client-id`, `x-client-secret`, and `x-api-version: 2025-01-01` loaded exclusively from Cloudflare secret bindings. It never reads provider response bodies and does not return keys, URLs containing credentials, header dumps, or response payloads.

It is disabled by default in every committed configuration. A privileged test operator must *separately* and temporarily set **ALL** of:
- `CASHFREE_SANDBOX_MODE=sandbox`
- `CASHFREE_SANDBOX_ENABLED=true`
- `CASHFREE_SANDBOX_NETWORK_TESTS_ENABLED=true`
- `CASHFREE_SANDBOX_RUN_MODE=auth_probe`

These vars only prepare a probe. The Worker still exposes **no public HTTP route, no Cron Trigger, no automatic invocation**. The probe runs only from an explicit internal/scheduled dispatch with appropriate Cloudflare access. Do not add a public `workers.dev` route, auth token in query string, recurring cron, or an unprotected payment callback merely to trigger a test.

The existing `read_only` run mode for fetching a *known existing* sandbox subscription ID remains unchanged.

## Interpret the first provider response conservatively

| Result | Meaning |
|---|---|
| `unauthorized` | HTTP 401. Invalid/disabled credentials or failed authentication likely |
| `forbidden_or_product_restricted` | HTTP 403. Account/product authorization may be missing |
| `not_found_auth_inconclusive` | HTTP 404 for a deliberately nonexistent plan. **Does NOT prove successful authentication** |
| `bad_request_auth_inconclusive` | HTTP 400/422. Invalid request or feature restriction possible |
| `unexpected_plan_found_investigate` | 2xx for a supposedly nonexistent plan. Investigate unexpected record response; do not assume product approval |
| `rate_limited` | 429 |
| `provider_unavailable` | 5xx |
| `transport_failed` / `invalid_response` | Network or transport problems; not credential proof |

Only these sanitized outcome labels may enter internal logs. Never show raw provider bodies/headers or log binding values. No real user's data or identifier is used.

## Execution gate: mobile-only Cloudflare account
The assistant has GitHub access but **no Cloudflare account action tool**, so it cannot remotely invoke a scheduled Worker test, read encrypted secrets, or inspect a real provider response. Cloudflare's documented scheduled testing endpoint is for a **Wrangler development session**, not a public URL on the deployed Worker. No automated cron is installed and its creation is **not authorized as part of this PR**.

For a real remote verification, use a trusted Cloudflare-authorized developer environment to dispatch a manually controlled scheduled event through supported tooling, or implement a separately security-reviewed Cloudflare Access-protected one-time test runner. A smartphone Cloudflare screenshot cannot prove a scheduled event has executed.

After the first controlled invocation: **restore `CASHFREE_SANDBOX_ENABLED=false`, `CASHFREE_SANDBOX_NETWORK_TESTS_ENABLED=false`, `CASHFREE_SANDBOX_RUN_MODE=disabled`** before concluding. Check Cloudflare Worker deployment settings and confirm both encrypted bindings remain attached. Without an authenticated 2xx response to a known valid READ request (or another clear Cashfree merchant-side signal), keep Subscriptions API readiness **unverified**.

## Acceptance checks
- [ ] Node tests, Pages build, Chromium and WebKit green.
- [ ] Dedicated Worker Wrangler flags unchanged and false; public Worker unchanged.
- [ ] No real Cashfree request in CI; no keys in GitHub/logs.
- [ ] No live/checkout UI, no mandate, no paid grant.
- [ ] Independent Cloudflare remote execution requested and documented later, not assumed.
- [ ] Cashfree Subscriptions API/product status declared proven only with proper evidence.

Sources:
- Cashfree documented **Fetch a plan** request (v2025-01-01): https://www.postman.com/cashfreedevelopers/cashfree-apis-v2025-01-01/request/gqu0p62/fetch-a-plan
- Cashfree Subscriptions developer flow: https://www.cashfree.com/devstudio/preview/subs/web/checkout
- Cloudflare scheduled event manual testing (development only): https://developers.cloudflare.com/workers/runtime-apis/handlers/scheduled/
