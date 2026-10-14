# Current engineering handoff

Snapshot: 2026-10-14 (Asia/Kolkata). Verify remote evidence before resuming.

## Current task
- Checked 2026-10-14 Asia/Kolkata. Owner confirms Cashfree Test/Sandbox API keys generated; owner explicitly requests secure MLOS sandbox integration while **payments disabled**. No secret values were provided or accessed. Existing main is based on onboarding readiness PR #242; current work on `feat/cashfree-sandbox-secret-bindings-20261014`.
- Branch adds `src/adapters/cashfree-sandbox-bindings.js` supporting Cloudflare encrypted plain Secret env and account Secrets Store async `.get()` bindings. Requires exact `CASHFREE_SANDBOX_MODE=sandbox`, `CASHFREE_SANDBOX_ENABLED=true`; separate `CASHFREE_SANDBOX_NETWORK_TESTS_ENABLED=true` for any real sandbox API calls. Default is off. Existing Cashfree adapter remains pinned to sandbox.cashfree.com; no live endpoint, checkout, order, authorization or entitlement writes.
- New automated tests in `tests/cashfree-sandbox-bindings.test.js` use synthetic fake values and mocked transport, assert disabled network, correct secret forwarding and no leak into the public Pages bundle. Guide: `docs/CASHFREE_SANDBOX_SECRET_SETUP.md` gives smartphone Cloudflare account-level Secrets Store steps and explicitly prohibits binding to the public `medical-learning-os-web` Worker or publishing credentials.
- Current status at feature checkpoint: code/docs committed on branch, GitHub PR/CI not yet verified; actual Cloudflare credential storage **not done**, merchant API tests **not done**, Cashfree Subscriptions enablement **unverified**. Do not claim deployed integration or merchant billing operational.
- Owner next action: on iPad/iPhone open Cloudflare Dashboard > account Secrets Store, create only `CASHFREE_TEST_APP_ID` and `CASHFREE_TEST_SECRET_KEY` as encrypted account secrets, unbound; no values pasted into chat. Later create/authorize an isolated staging test harness to bind them and validate real Cashfree sandbox lifecycle without enabling customer billing.
- Future work must preserve existing Cloudflare Pages/Workers deploy, PostHog/Sentry, study/PYQ and rights gates, PhonePe alternative, and deferred institutional scope. Keep final owner handoff and PR status verified on main; report unknowns precisely.

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
