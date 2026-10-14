# Current engineering handoff

Snapshot: 2026-10-14 (Asia/Kolkata). Verify remote evidence before resuming.

## Current task
- Checked 2026-10-14 Asia/Kolkata. Owner screenshots confirmed two Cloudflare account Secrets Store entries `CASHFREE_TEST_APP_ID` and `CASHFREE_TEST_SECRET_KEY`, each Workers scoped and active, no visible values. This **does not mean** attached to any Worker or validated by Cashfree.
- PR #245 was merged to main as `591e841bcfb61f94ebe04bca54f7190d04c09526`. GitHub Actions [Foundation run 38565156604](https://github.com/mdmoazzam291/Medical_Learning_OS/actions/runs/38565156604) has successful check, Chromium and WebKit jobs. No browser or authenticated merchant transaction was actually performed with Cashfree keys.
- Staging-only code: `cloudflare/cashfree-sandbox-worker.js` (every HTTP route returns 404; internal/scheduled diagnostic can only read GET existing TEST subscription after separate flags) and `wrangler.cashfree-sandbox.jsonc` (name `mlos-cashfree-sandbox`, `workers_dev=false`, `preview_urls=false`, no crons, all run flags disabled). New `tests/cashfree-isolated-worker.test.js` exercises no-route/no-schedule/no-payment properties. Main app's root `wrangler.jsonc`, learner-facing UI, payment permissions and entitlement grants unchanged.
- **Not deployed**: Cloudflare Dashboard does not have an authenticated connector here. No isolated Worker has been created and no Secrets Store bindings attached. There was no real Cashfree sandbox GET or subscription authorization. No live checkout, production payments, paid grants or institutional billing.
- Exact next action for the owner/Cloudflare-authorized operator: deploy the *separate* Worker from the GitHub project using specifically `npx wrangler deploy -c wrangler.cashfree-sandbox.jsonc` (never the root Wrangler config) in a trusted Cloudflare-connected environment. Then from Cloudflare Workers & Pages select `mlos-cashfree-sandbox` → Settings → Bindings → Add → Secrets Store and map the two existing entries to the same env variable names. Leave all network flags disabled. iPhone-only owners should not select a default deploy command or bind secrets to public `medical-learning-os-web`; check the Worker name first.
- Only after those actions and merchant Subscriptions access confirmation: create a separate explicitly authorized, read-only sandbox diagnostic and test lifecycle, with no charging.
- Latest mobile-specific instructions: `docs/CASHFREE_SANDBOX_SECRET_SETUP.md`. Private strategy Drive governance document may contain status but not credentials. PhonePe remains fallback design-only. Rights-cleared PYQ intake and Cloudflare login/UX changes remain separate.

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
