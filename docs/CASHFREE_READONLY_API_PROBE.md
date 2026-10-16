# Cashfree read-only sandbox API probe
**Prepared:** 2026-10-15 (Asia/Kolkata)  
**Owner scope:** Consumer billing only. All actual payment operations, checkout, subscriptions, UPI AutoPay, live keys, and paid grants remain disabled.

**October 16 correction (supersedes route instructions below):** this runner uses
remote development, so pinned Wrangler 4.151.0 must receive the single test at
`http://127.0.0.1:8787/__scheduled`. `/cdn-cgi/local/scheduled` is a local Miniflare
control endpoint and was incorrect for this remote middleware flow. The first
owner-run GitHub attempt returned local 404 without a verified provider result.
See [the versioned-source diagnosis](CASHFREE_REMOTE_ROUTE_DIAGNOSIS.md). No result
now exits nonzero; never retry automatically. Token revocation and GitHub secret
deletion after that first attempt still require owner confirmation.

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
| `redirect_response_auth_inconclusive` | HTTP 3xx observed without following/forwarding credentials; not authentication proof |
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

## 2026-10-15: Optional iPad-only one-shot remote diagnostic (manual operator)

The previously deployed Cloudflare Worker is safe and remains **OFF** by default. The owner's Cloudflare UI confirmed zero Cron Triggers and the editor's Schedule test control was disabled. Instead of changing live runtime variables or creating a cron, `scripts/cashfree-probe-once.sh` supports **temporary Wrangler remote development**. Cloudflare officially supports both `wrangler dev --remote` (code executes in a temporary Cloudflare preview environment with remote bindings) and device OAuth authentication, which works from a separate browser/device. Exact behavior of your Secrets Store bindings in this temporary development mode has **not yet been tested**, so failure must not be interpreted as invalid Cashfree API keys.

### Owner actions on iPad, without a computer

**Only if GitHub Codespaces is available in your account**, and after this script has passed CI and merged:

1. Open [GitHub Codespaces](https://github.com/codespaces) in iPad Safari, create a fresh private Codespace for `mdmoazzam291/Medical_Learning_OS` from the latest `main`. Codespace availability/usage may depend on your GitHub account.
2. Open Codespaces' terminal. Ensure recent Node/npm are available (`node --version`). If Node is older than the repository's required 24, use `nvm install 24 && nvm use 24`.
3. Execute `npx --yes wrangler@^4.119.0 login --device --browser=false`. Wrangler will show a URL and a temporary device code. Open the URL in a **private iPad browser tab**, sign in to your own Cloudflare account and approve only the requested permissions. **Never paste OAuth codes, access tokens or secrets into ChatGPT.** Cloudflare's device-login support starts in Wrangler v4.119.0.
4. After login succeeds, run **exactly**: `MLOS_CONFIRM_ONE_CASHFREE_GET=YES_TEST_ONLY bash scripts/cashfree-probe-once.sh`. This script checks the disabled, isolated Wrangler file before proceeding. It starts a temporary remote-dev preview with **process-only** sandbox flags, binds existing account secrets remotely, invokes the local `/cdn-cgi/local/scheduled` test endpoint **once**, and closes the temporary process, deleting local scratch logs.
5. Record **only** the sanitized result label printed by the script, never a raw log or provider body. It may read `unauthorized`, `forbidden_or_product_restricted`, `not_found_auth_inconclusive`, `transport_failed`, or “No verified provider result captured.” **A 404 is not proof of successful authentication.** No result is assumed until actually observed.
6. Finish with `npx --yes wrangler@^4.119.0 logout`, close the session and **delete the Codespace** once you have checked there are no unrelated changes to keep. This reduces exposure from temporary Cloudflare OAuth tokens stored within that development environment.

**Do not run `wrangler deploy`, `wrangler secret put`, `wrangler preview secret put`, or use any Cloudflare production key.** You do not need to change Cloudflare's worker Settings, stored secret values, public route, Cron Trigger or the main `wrangler.jsonc`. The script only uses `dev --remote --test-scheduled` with the explicitly named isolated configuration.

**Important limitation:** Cloudflare documents that *local* development cannot retrieve production Secrets Store values, and that *remote* development uses remote bindings. Whether this particular remote preview has access to both account Secrets Store bindings requires real-world confirmation. If remote preview fails, stop and report only a generic error type. Do **not** try to export/decrypt the Secrets Store values into Codespaces to work around it.

**Security boundary:** The Codespace terminal is authenticated as the owner through Cloudflare device authorization. The temporary preview is not a production deployment and has no useful public HTTP route (all fetch requests return 404). One fixed GET is used for testing; customer checkout, subscriptions, mandates, webhook writers, recurring crons and learner entitlements stay untouched.

Official references:
- [Wrangler device authentication without callback, Aug 2026](https://developers.cloudflare.com/changelog/post/2026-08-04-wrangler-login-device-flow/)
- [Remote development executes on Cloudflare infrastructure](https://developers.cloudflare.com/workers/local-development/)
- [Wrangler `dev --var` and `--test-scheduled`](https://developers.cloudflare.com/workers/wrangler/commands/workers/)
- [Secrets Store Worker integration, local/remote limitations](https://developers.cloudflare.com/secrets-store/integrations/workers/)

## Runner shutdown repair (2026-10-15; pending review)

The runner now starts the preview in an isolated Bash job process group. On exit it sends TERM to the group, allows up to two seconds for shutdown, then sends KILL to remaining group members before removing its temporary logs. This also handles descendants left behind when `npx` exits early. INT and TERM cancel the runner with exit codes 130 and 143 respectively, without continuing to the scheduled trigger after cancellation is handled.

Regression checks use local mock commands and real child processes, including a TERM-resistant descendant. They cover normal completion, startup failure, INT and TERM; they make no Cloudflare or Cashfree requests. PR #257 now integrates the scheduled-route fix from PR #256 alongside shutdown cleanup. Review the combined repair before another owner-authorized live attempt. Authentication and Secrets Store availability in remote preview remain unverified. Preserve the owner's existing Codespace and unrelated changes when preparing that attempt.
## October 15, 2026: scheduled testing route compatibility
Cloudflare's current Wrangler documentation describes `--test-scheduled` as exposing `/cdn-cgi/local/scheduled`. An earlier iteration of the owner-run script attempted `/__scheduled?format=json`. The combined runner and its regression test now use the documented path. This is a **test-route fix only**, not a new Cloudflare Cron Trigger, deployed Worker route or payment API operation. Do not invoke both endpoints or retry the event automatically if the first endpoint fails; a single failed test remains inconclusive.
Reference: https://developers.cloudflare.com/workers/wrangler/commands/workers/

## October 16, 2026: browser-only GitHub alternative (prepared)

The owner selected an alternative after Codespace authentication/pasting errors.
See [the detailed manual GitHub guide](CASHFREE_GITHUB_MANUAL_TEST.md). The new
workflow wraps the same reviewed one-shot runner, requires a fresh manual dispatch
on main with YES_TEST_ONLY, rejects reruns and malformed token input, and receives
only a short-lived Cloudflare token through a dedicated GitHub Actions secret.
Cashfree key values remain bound in Cloudflare. Main merge and actual execution
are separate owner decisions; no real test or authentication was performed while
preparing it. The earlier successful web Preview and owner interface acceptance
do not establish Cashfree API readiness.

## 2026-10-16: Post-run transport failure diagnosis (offline only)

Two separate owner-dispatched test runs are documented:
1. [First run 38827800192](https://github.com/mdmoazzam291/Medical_Learning_OS/actions/runs/38827800192) returned **local scheduled simulation HTTP 404** and captured no provider result. PR #258 corrected the remote Wrangler scheduled route.
2. [Second run 38830783379](https://github.com/mdmoazzam291/Medical_Learning_OS/actions/runs/38830783379) executed after the route correction. Sanitized GitHub job output includes `Cashfree TEST response classification: transport_failed`. That classification happens when the outbound `fetch()` throws, *after* the TEST bindings were resolved and the code attempted the fixed sandbox GET. It does not prove the request reached Cashfree, or that the keys are accepted.

The original probe used `redirect: 'error'`, which can convert a Cashfree HTTP redirect into an indistinguishable fetch rejection. As an **offline diagnostic improvement only**, the code now uses `redirect: 'manual'` and treats any returned HTTP 3xx as `redirect_response_auth_inconclusive`. No redirect is followed; Cashfree TEST credential headers cannot be forwarded to another hostname through the probe. No `Location` or response body is read, returned or logged. Other fetch exceptions remain the sanitized `transport_failed` classification. No cause for the actual second-run failure has been established.

The user confirmed in the latest Work conversation that they deleted the temporary Cloudflare API token `mlos-cashfree-actions-once` and the GitHub Actions repository secret `MLOS_CASHFREE_PROBE_CF_TOKEN`. This is **user confirmation**, not independent API readback. Neither credential should be regenerated by this PR. The encrypted Cashfree Test API bindings stay in the account Secrets Store, and the deployed Worker network flags remain disabled.

**Release boundary:** no new one-shot workflow dispatch or provider API call has been authorized. Any third attempt requires a separately approved execution, ephemeral authorization scoped to the sandbox, and cleanup immediately afterwards. Do not infer success from a green GitHub Actions run or an HTTP 404 for the fake plan.

Reference: [Cloudflare Workers Request redirect modes](https://developers.cloudflare.com/workers/runtime-apis/request/).
