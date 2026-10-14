# Current engineering handoff

Snapshot: 2026-10-14 (Asia/Kolkata). Verify remote evidence before resuming.

## Current task
- Checked 2026-10-14 Asia/Kolkata after remote GitHub readback. Owner confirmed Cashfree **Test/Sandbox keys generated**, not shared with assistant or source control. Requested safe MLOS sandbox integration with no customer charging.
- **PR #243 merged** into main as `18af38b87fb4856da19df66f8b230de0992c5e57`. GitHub Foundation run **38561694687** check/Chromium/WebKit all passed. Branch is complete; no running code changes.
- `src/adapters/cashfree-sandbox-bindings.js` reads Cloudflare encrypted Worker Secret values or account Secrets Store `.get()` bindings, requires sandbox-only environment and independent explicit network-tests flag (default OFF), exposes server-internal inert test-only methods and boolean readiness; **never issues paid access**. Existing adapter pinned to sandbox host. Tests in `tests/cashfree-sandbox-bindings.test.js` included in passing CI. No public Pages asset or Worker routes changed.
- `docs/CASHFREE_SANDBOX_SECRET_SETUP.md` explains iPhone/iPad Cloudflare account-level Secrets Store setup. No Cashfree TEST keys uploaded, stored in Cloudflare, accessed or verified by assistant. Cashfree merchant Subscriptions/AutoPay activation has not been verified; there has been no live merchant sandbox request, deployed staging Worker or test mandate.
- **Next owner action:** privately save the generated Test App ID and Secret Key as two encrypted account-level Secrets Store entries `CASHFREE_TEST_APP_ID` and `CASHFREE_TEST_SECRET_KEY` with Workers scope; leave both unbound to public `medical-learning-os-web`. Confirm secret names only in chat, never values.
- After owner confirmation, separately authorize isolated staging Worker binding, a privileged sandbox-only harness and real Cashfree test API/subscription verification. Checkout, recurring billing, real debits, billing ledger and consumer paid entitlements remain disabled, PhonePe alternative design-only, institution payments deferred.
- Existing unrelated Cloudflare preview/auth, product branding and rights-cleared PYQ content ingestion tasks unaffected.

## Latest product state from repository evidence
- Sage Precision default; Lavender Precision selectable; independent light/dark appearance. STATUS records PR #224 / merge 9891df556aca22e634e42d87cf05fd21e407124d, passing Node/check/build/browser CI and production build evidence. This handoff does not independently verify hosted authenticated switching.
- Server-authorized Admin master remains top-level. Each tool has its own workspace; Overview is a summary. Preserve latest owner choices rather than earlier Account-child proposals.
- Genuine polished-PYQ intake is the next product input. Supplied final material, source/rights evidence and actual authorized review remain required. Do not manufacture a replacement batch or resurrect erased pilots.
- Material release adapter code exists; actual external archive/staging ports and real-material acceptance remain pending as recorded in README/PROJECT_CONTEXT/STATUS.
- Open PR snapshot: #203, docs/parse-brand-identity-20261008, proposes PARSE branding. It is unrelated; do not merge, reject or rename the product as part of continuity. Recheck open PRs because this inventory may change.

## Access and verification limits
An outgoing AI's GitHub, Drive, cloud, Library and browser sessions do not transfer automatically. Configure authorized access separately; use AI_ENVIRONMENT.md. The local synthetic loop needs Node >=24 and no API keys. Content-review/publication authority is unchanged. No background watcher, cross-provider memory sync or atomic task lock is installed.

## Next handoff fields
Replace the current-task section for each new task: objective/acceptance, owner or released ownership, date, branch, base/head commit, PR, touched files, unfinished work, exact test results/time, blockers, authorization/release state and next action. Record uncertain operations as uncertain and reconcile before retrying. Push WIP on the feature branch before provider transfer; stop the outgoing remote job first.
