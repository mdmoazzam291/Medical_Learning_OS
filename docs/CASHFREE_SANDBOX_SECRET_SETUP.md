# Cashfree Test/Sandbox secrets and server-only integration

**Date:** 2026-10-14 (Asia/Kolkata)  
**Current status:** User confirmed Cashfree **Test/Sandbox API keys generated**. This is owner-reported credential issuance, not independent merchant API authentication. No keys have been provided to MLOS tools, GitHub or this chat. Credentials are NOT connected to a running Cloudflare Worker. No real sandbox request has been made with owner credentials.

## Architecture decisions and safety boundary

- Keep the existing primary Cashfree / alternative PhonePe selection from ADR-116. No Razorpay restoration.
- Client-visible Free/Pro/AI Pro Plans page **continues to have disabled purchase buttons**. No checkout routes, processing endpoints, subscription storage, paid grants, or recurring debits.
- The already-built `src/adapters/cashfree-test.js` is server-only and communicates exclusively with `https://sandbox.cashfree.com` (Cashfree Subscriptions API version `2025-01-01`).
- `src/adapters/cashfree-sandbox-bindings.js` is an **undelivered server-only configuration bridge**, not deployed or imported by the public app. It accepts both ordinary encrypted Worker secret strings and Cloudflare Secrets Store bindings (objects exposing asynchronous `get()`).
- Do not add secrets to `wrangler.jsonc`, `web/cloud-config.js`, browser localStorage, a public Pages deployment, a GitHub Action log, or a Google Doc.
- Since `wrangler.jsonc` currently deploys the public `medical-learning-os-web` Worker, DO NOT attach Cashfree secret bindings to this public Worker during preparation. Use Cloudflare **account Secrets Store**, initially **unbound**, or a future separate restricted staging Worker.
- There is intentionally **no accessible network route** in the new bridge. A future privileged server test harness, independently approved, must invoke it.

## Step-by-step from iPad/iPhone: store test credentials privately

1. Open [Cloudflare Dashboard](https://dash.cloudflare.com/) in Safari or Chrome. On iPhone enable Request Desktop Website if necessary. Select the same Cloudflare account used by MLOS.
2. Open the account-level **Secrets Store** (not Workers & Pages > production Worker). Create a store if the dashboard requires it, then choose **Create secret**. Choose a scope granting Workers access.
3. Add a secret with exact name `CASHFREE_TEST_APP_ID`. Paste its matching **Cashfree TEST App ID** into the secret-value field and save. Do not paste it into chat.
4. Add a second secret named `CASHFREE_TEST_SECRET_KEY`. Paste its matching **Cashfree TEST Secret Key** and save. Keep the name capitalized exactly as shown. Do not post a screenshot showing the values.
5. A third `CASHFREE_TEST_WEBHOOK_SECRET` is needed only when implementing webhook verification. Do **not** manufacture one or reuse a value without confirming Cashfree's applicable webhook signing-secret policy. Add it when a webhook flow is actually configured.
6. **Stop here.** Do not select the public `medical-learning-os-web` Worker for a binding, do not deploy a webhook endpoint, and do not enable any payment or billing flag. Record only “test App ID and secret securely stored in Cloudflare Secrets Store” without values.

If the account has no Secrets Store access on the current Cloudflare plan/role, stop. A safer fallback is a dedicated, non-public sandbox Worker with encrypted **Worker Secret** variables (not plain text vars), not the live learner Worker. Obtain owner approval for its creation before attaching secrets.

## Future restricted staging Worker (not created by this change)

On a **separate internal sandbox Worker**, add Secrets Store bindings with environment names matching the two names above and set these NON-SECRET variables:
- `CASHFREE_SANDBOX_MODE = sandbox`
- `CASHFREE_SANDBOX_ENABLED = true` (**enable private binding evaluation only**)
- `CASHFREE_SANDBOX_NETWORK_TESTS_ENABLED = false` (**keep network tests off initially**)
- `CASHFREE_SANDBOX_RETURN_ORIGIN = https://<your dedicated staging origin>` (omit until approved URL exists).

`inspectCashfreeSandboxReadiness(env)` reports only boolean presence/enablement, not any secret value. `createCashfreeSandboxService(env, {fetchImpl})` is an internal-only closure with test create/fetch/signature methods. Even if a future privileged staging harness sets network tests to `true`, the adapter is pinned to sandbox, subscription receipts remain inert, and paid consumer authorization is unaffected.

Do not publish the private staging service on a public `*.workers.dev` address with unprotected helper methods. Neither the service nor the bridge creates any fetch route by itself. No automatic request is made merely by binding secrets.

## Subscription product-specific requirement

Ordinary **Payment Gateway Test API keys do not prove that Cashfree Subscriptions / UPI AutoPay is enabled**. Verify the Subscriptions product status in the Cashfree merchant dashboard separately. Web Checkout differs from direct S2S and does not imply merchant PCI/S2S approval. Cashfree may require enabling subscription features before a test authorization can be created.

## Verification matrix and next gate

| Test | Status |
|---|---|
| Owner generated TEST App ID/Secret | **Confirmed by owner**; do not reproduce values |
| Encrypted Cloudflare storage | **Pending owner action/confirmation** |
| Secrets attached to private staging worker | **Not done** |
| Locally mocked sandbox create/fetch + signature tests | Executed by CI after PR submission, not yet on real account |
| Real Cashfree sandbox API response with own keys | **Not done** |
| Cashfree Subscriptions product and mandate workflow enabled | **Unverified** |
| Public checkout, customer charges, premium grants | **Disabled**, and remain so |

When keys are stored, confirm only the secret names and that they are in account Secrets Store. Never send the secret values, their full screenshots or exported plaintext files. The subsequent engineering milestone is creating an **authenticated isolated test harness**, reading bindings in Cloudflare, and exercising Cashfree sandbox subscription creation/status securely. Any purchase UI and charging still require a separate explicit owner decision and educational/content readiness gates.

References:
- https://developers.cloudflare.com/secrets-store/integrations/workers/
- https://developers.cloudflare.com/workers/configuration/secrets/
- https://developers.cloudflare.com/workers/configuration/environment-variables/
- https://www.cashfree.com/docs/api-reference/payments/latest/subscription/create-subscription
- https://www.cashfree.com/devstudio/preview/subs/web/checkout

## Engineering verification receipt (2026-10-14)
Server-only secret-binding helper and safety tests were merged to main in [PR #243](https://github.com/mdmoazzam291/Medical_Learning_OS/pull/243), commit `18af38b87fb4856da19df66f8b230de0992c5e57`. [Foundation workflow run 38561694687](https://github.com/mdmoazzam291/Medical_Learning_OS/actions/runs/38561694687) passed check, browser and WebKit. This is **not** independent Cloudflare secret storage or a live Cashfree sandbox transaction. Only the user can confirm placing the two test credential values in the encrypted store.

## 2026-10-14: Both TEST secrets saved, confirmed by owner screenshots

The owner supplied screenshots from Cloudflare **Secrets Store**, showing exactly two active Workers-scoped entries with the names `CASHFREE_TEST_APP_ID` and `CASHFREE_TEST_SECRET_KEY` (usage 2/100). No secret **values** appeared. This supersedes the earlier pending-storage status. Workers scope `Active` means the secrets can be used by Workers; it is **not evidence of binding to a particular Worker**, validating Cashfree account keys or enabling subscriptions.

### Next isolated deployment, intentionally not carried out

New standalone `cloudflare/cashfree-sandbox-worker.js` and `wrangler.cashfree-sandbox.jsonc` provide a **different Worker** named `mlos-cashfree-sandbox`:
- `workers_dev=false`, `preview_urls=false`, `triggers.crons=[]`. No HTTP endpoint is exposed. Every `fetch()` returns 404.
- No secret IDs, values, names or store IDs are stored in the Wrangler file. Both `CASHFREE_SANDBOX_ENABLED=false` and `CASHFREE_SANDBOX_NETWORK_TESTS_ENABLED=false` default OFF, with run mode disabled.
- A scheduled/internal-only diagnostic may later check that bindings exist; an actual Cashfree call additionally requires explicit sandbox and network-test flags, a pre-existing TEST subscription ID and a separate controlled scheduled event invocation. It calls **GET only** against sandbox Cashfree, never starts checkout, creates mandates, or grants paid access.
- No cron is scheduled, and no Worker is deployed by merely merging these files.

**After the isolated Worker is independently deployed** (Cloudflare authenticated operator action; not automated by this repository change):

1. Open Cloudflare Dashboard → Workers & Pages → **`mlos-cashfree-sandbox`**, not `medical-learning-os-web`.
2. Open **Settings → Bindings → Add → Secrets Store**.
3. Set binding variable name `CASHFREE_TEST_APP_ID`; select the existing identically named account secret.
4. Add the second binding variable name `CASHFREE_TEST_SECRET_KEY`; select the existing identically named account secret.
5. Review that only the new **sandbox** Worker is targeted, and choose the version/deployment controls appropriate for that Worker. This cannot be done until that separate Worker exists.
6. Do not add a `CASHFREE_TEST_WEBHOOK_SECRET` before implementing Cashfree's approved webhook-secret process. Do not attach secrets to the learner-facing Worker or share their values in chat.

**Deployment requires separate authorized Cloudflare access**, because ChatGPT's current connected tools have GitHub but no authenticated Cloudflare account actions. Never place Cloudflare API keys in repo or chat to compensate. For future Wrangler deploy use `npx wrangler deploy -c wrangler.cashfree-sandbox.jsonc` from a trusted authenticated environment, then bind Secrets Store via Dashboard; do not run this against the root `wrangler.jsonc`. Deployment can be done with safe options and disabled flags; actual real sandbox network tests must be a separate deliberate action. Even a 404 from Cashfree is not definitive proof that subscriptions are enabled.
