# Current engineering handoff

Snapshot: 2026-10-14 (Asia/Kolkata). Verify remote evidence before resuming.

## Current task
- Checked 2026-10-14 Asia/Kolkata. Owner uploaded screenshots of Cloudflare **Secrets Store** listing two exact names: `CASHFREE_TEST_APP_ID`, `CASHFREE_TEST_SECRET_KEY`, both shown Workers scoped / Active, 2/100 usage. Secret values not visible or accessed. This updates previous “storage pending” status. Does **not** establish a Worker binding, merchant API validity or Subscriptions product activation.
- Current branch `feat/cashfree-isolated-staging-worker-20261014`, base main `1682ecdf4457a86d7e6844a710a6709d32cd385d`. Adds `cloudflare/cashfree-sandbox-worker.js` with fetch 404-only and scheduled/internal read-only diagnostics, independent `wrangler.cashfree-sandbox.jsonc` named `mlos-cashfree-sandbox` (workers_dev=false, preview_urls=false, no cron triggers, all test/network flags false), `tests/cashfree-isolated-worker.test.js`. Updates docs/STATUS and docs/CASHFREE_SANDBOX_SECRET_SETUP.
- Not deployed. No Cloudflare access connector, no secret reads, no actual Cashfree API call, no subscription creation/mandate, no live checkout, no grants. Main `wrangler.jsonc` public production config and learner-facing code unchanged.
- Current verification at write checkpoint: GitHub file commits saved on task branch; PR and CI pending. Test in standard GitHub Node/check/build/Chromium/WebKit pipeline. Do not claim passed until actual CI.
- Exact next action: open PR, run CI, merge only if green. Then record merge receipt. Owner/authorized operator may later deploy *separate* isolated Worker and bind the already-stored two account secrets via Cloudflare Workers & Pages → mlos-cashfree-sandbox → Settings → Bindings → Add → Secrets Store. Never bind to `medical-learning-os-web`. Controlled real sandbox test needs separate staging deployment and confirmation Cashfree Subscriptions enabled.
- PhonePe remains fallback design-only; no institution/payment production work; personal medical learning & content/purge policies unchanged. Existing Cloudflare auth/nav tasks and branding PRs are unrelated.

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
