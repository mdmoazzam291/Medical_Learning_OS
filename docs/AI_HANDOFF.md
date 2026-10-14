# Current engineering handoff

## Cashfree one-shot runner merged (2026-10-15 IST; latest)
- PR #254 merged to main as `ee5684d7de41d2efa316fe82569f2760a452099f`; Foundation CI run 38638187189 all three jobs successful (check, Chromium, WebKit).
- User requested next best necessary step after verifying no Crons in Cloudflare dashboard. Added `scripts/cashfree-probe-once.sh` and `tests/cashfree-one-shot-runner.test.js`, iPad Codespaces/Cloudflare OAuth device-auth procedure in `docs/CASHFREE_READONLY_API_PROBE.md`.
- Owner must separately create a private GitHub Codespace on main, authenticate to Cloudflare via `wrangler login --device --browser=false`, and deliberately invoke `MLOS_CONFIRM_ONE_CASHFREE_GET=YES_TEST_ONLY bash scripts/cashfree-probe-once.sh`. Device code and account credentials remain owner-only.
- The one-time remote dev session is ephemeral and attempts one GET-only Cashfree sandbox plan probe through local scheduled simulation. It does not deploy a Worker or create Cron triggers. Runtime disabled config remains unchanged, no public route, checkout or paid grants. Cloudflare's production Secrets Store resolution in remote preview is not established until tried.
- **No Codespace, OAuth login, Cloudflare remote dev invocation or real Cashfree merchant request has been performed from assistant tools**. No observed provider result. After test, `wrangler logout` and delete Codespace to reduce OAuth residue. Don't export raw Secrets Store data. An inconclusive 404 is not successful authentication.


## Cashfree next milestone: one-shot iPad remote-dev runner (2026-10-15)
- Owner's Cloudflare screenshot shows `mlos-cashfree-sandbox` has no Cron triggers. Editor Schedule test button disabled. Cashfree Test API keys remain encrypted/bound; checkout and network flags off.
- Branch `ops/cashfree-one-shot-remote-dev-runner-20261015` adds an operator-run **bash** harness `scripts/cashfree-probe-once.sh`, static fail-closed tests, and iPad+Codespaces setup notes in `docs/CASHFREE_READONLY_API_PROBE.md`. This is a Cloudflare temporary remote development session only, not a Worker deployment. It forces explicit owner confirmation, uses `wrangler dev --remote --test-scheduled` and process-only flag overrides, one local scheduled event and cleanup.
- Cloudflare OAuth 2.0 Device Authorization (Wrangler v4.119.0+) enables login from iPad even though Codespaces runs remotely. Owner authorizes login in their own browser; do not request or save the OAuth code/token in chat or GitHub. Recommend Wrangler logout and deleting the Codespace after trial.
- Caveat: Cloudflare documents production Secrets Store values unavailable to *local* dev, and remote dev binds remote resources, but the actual preview connectivity to these secrets has **not been established**. A failed preview does not imply invalid Cashfree keys. No actual Cashfree GET performed.
- This branch and PR are pending CI at checkpoint. On green, merge docs/test/runner only and ask owner to open an isolated iPad Codespace, run device login + one-shot probe. No Cron, public route, checkout, mandate or entitlements. Do not conflate this with mobile navigation or other PRs.


## Cashfree read-only API diagnostic release receipt (2026-10-15, supersedes pending section)
- PR #252 merged into `main` at `00989637a2907b1233aefa80f94b3a06edf4bdee`. GitHub Foundation run **38634200958** `check`, `browser`, `webkit` all successful.
- Code on main: `probeCashfreeSandboxPlanAccess` in `src/adapters/cashfree-test.js` (GET nonexistent test plan, sanitized status enum, no response body), server-only service method in `src/adapters/cashfree-sandbox-bindings.js`, `auth_probe` run mode in `cloudflare/cashfree-sandbox-worker.js` (still HTTP 404, no cron). Tests all mocked; no Cashfree credentials read by assistant.
- **No real Cloudflare event or Cashfree sandbox authentication request has occurred.** All committed sandbox/network mode flags still disabled. 404 for missing test plan is inconclusive. No published subscription plans/mandates/payment access granted, no public checkout.
- Next: verify separate Worker post-main Cloudflare build and bindings in the Dashboard, then plan an authenticated **one-time internal scheduled event** to run GET-only probe, without public routes/automatic cron. Since this chat cannot access Cloudflare as a connected app, explicit owner action or supported authorized cloud tooling is required. Preserve premium grant locks and PhonePe alternative.
- Previous “PR pending” Cashfree subsection below is historical. Preserve unrelated mobile UI and auth state.


## Cashfree sandbox API readiness (2026-10-15 IST, independent of mobile UI work)
- Owner supplied screenshots of Cashfree Test Environment Subscriptions menu, All Subscriptions and All Plans (No Plans Found under 30-day filter). Provider API authorization is NOT established by the dashboard.
- Working branch: `feat/cashfree-readonly-auth-diagnostic-20261015`. Touches only `src/adapters/cashfree-test.js`, `src/adapters/cashfree-sandbox-bindings.js`, `cloudflare/cashfree-sandbox-worker.js`, Cashfree probe tests, and relevant docs. The separate Worker has no public route/cron, and default-off flags are unchanged.
- Adds controlled GET-only nonexistent-plan probe, returns sanitized statuses; 401 is rejected, 403 forbidden, 404 **inconclusive**, never writes or issues paid grant. Cloudflare network probe requires separately enabled flags AND a privileged manual scheduled dispatch. No merchant credentials/keys read or sent; GitHub tests use mocks only.
- New canonical operations doc: `docs/CASHFREE_READONLY_API_PROBE.md`. No real Cashfree API call can be made by these ChatGPT tools because Cloudflare account actions are unavailable. Do not create a public test route/cron or call the probe successful based on CI. PhonePe remains design-only fallback.
- PR/CI and main merge status pending at checkpoint; recheck GitHub before resuming. Treat Cloudflare deployment as separate and monitor actual build result. Preserve parallel mobile-nav/auth/branding work.


## Phone-sidebar temporary pin removal (ChatGPT, 2026-10-14 IST)
- Objective: owner-requested temporary suppression of shortcut-pin icons in the mobile sidebar, while gaining text space without changing sidebar width or removing saved pins. Independent from the Cashfree binding, OAuth, PARSE branding branches.
- Branch: `fix/phone-sidebar-hide-pins-20261014`, based on main `bfcc43deb43a89057d303bf58f1f2ddeb9855532` (PR #250 previously merged). Files: `web/navigation.css`, `tests/navigation-mobile-drawer-width.test.js`, `scripts/navigation-browser-check.js` plus STATUS/handoff.
- Implementation: phone-only `.mlos-panel .mlos-pin{display:none}`, leaving desktop/tablet controls, stored pin preferences and pinned destinations unchanged. Code commits `ecfccf565b203518eb6f24412ea2c0784dd80d9d`, `5cc9402a4b9cd3190ba25355892cf0f0d3415366`, `87a528e0d911252ef111be5d5e4b73acdb982f59`.
- Verification/status: tests and browser CI pending at this checkpoint, not deployed. Next: open PR, wait for full check/browser/WebKit success, merge with head-SHA lease, confirm Cloudflare `medical-learning-os-web` production build and request refreshed iPhone screenshot. Do not claim build success before verified.


## Mobile drawer follow-up (ChatGPT, 2026-10-14 IST, owner screenshot)
- User-provided 1179px-wide iPhone screenshot shows drawer boundary at ~779px (~257 CSS px on a 390 CSS-px viewport). This verifies earlier PR #249 is rendered after production build, but the ~8% width reduction from prior 280px is not meaningful enough.
- Task scope: `web/navigation.css`, `tests/navigation-mobile-drawer-width.test.js`, `scripts/navigation-browser-check.js` and relevant docs only. Branch `fix/mobile-drawer-compact-verified-20261014` off main `a66c3f1160e606a2d67c2955b249c5335437e9e1`, distinct from Cashfree, OAuth, PARSE branding work.
- Implemented width `min(clamp(216px,58vw,244px),calc(100dvw - 96px))` on both mobile open paths; expected widths 216/217.5/226.2/244px at 320/375/390/430px. Keep two-column mobile Workspaces grid and readable long labels with wrapping, minimum accessible controls and full-width closed workspace.
- Added CSS regression targets plus runtime Playwright geometry/control-fit assertions at four widths. Code commits: `2fbb1ab2fcfc44a998b8c22106d9daaff5bb690b`, `40dd42e1bf2dd4a4e039dcb1140210471a1e9105`, `65777a66eed4402e5fc65f46bdddcbbfb04f3779`.
- Verification: not yet externally executed at this checkpoint. Next: open PR, inspect full check/browser/WebKit CI, fix any failures, squash-merge only on green, inspect Cloudflare `medical-learning-os-web` Build, then request fresh native iPhone screenshot. No content/data/admin/secret mutation intended. Prior PR #249 merged as `a66c3f1`; its learner Worker production build succeeded.


## Independent mobile-navigation task (ChatGPT, 2026-10-14 IST)
- Objective: reduce the iPhone Account/Study/Library/Exams sidebar footprint while retaining accessible navigation and an obvious outside-dismissal region. Requested after owner screenshot on `medical-learning-os-web.medicalos.workers.dev`.
- Owner/scope: ChatGPT owns only `web/navigation.css`, `tests/navigation-mobile-drawer-width.test.js` and this task's STATUS/handoff entries on branch `fix/mobile-drawer-safe-width-20261014`; base was current `main`. Existing Cashfree token-scope work and OAuth/branding PRs remain separately owned and untouched.
- Code commits `937f3709eea3edf85627559759d5353d6a140209`, `2098e722e5b76c35df0a373879b634b106a92550` (regex repair `1024ed395b16f645963a842dff7d4c8e66dc920d`). PR [#249](https://github.com/mdmoazzam291/Medical_Learning_OS/pull/249) open, unmerged at this checkpoint.
- Changed: responsive drawer width `min(clamp(240px,66vw,272px),calc(100dvw - 64px))` in both open-path declarations, mobile grid spacing, wrapping long menu labels and a 40×44px pin tap target; no JS, app content, server or worker modification.
- Verification: static checks of CSS selectors and 320/375/390/430px width math passed; full Node/Pages/Chromium/WebKit CI and hosted Safari checks pending. No production deployment or user-visible release claimed.
- Exact next action: inspect PR #249 workflow status, fix failing checks if any, and verify Account plus other master drawers at mobile widths; if green, separately decide/authorize merge and verify Cloudflare-deployed behavior. Preserve the active Cashfree handoff below.


Snapshot: 2026-10-14 (Asia/Kolkata). Verify remote evidence before resuming.

## Current task
- Checked 2026-10-14 19:12 IST. User screenshot of Cloudflare `mlos-cashfree-sandbox` Settings confirms both account Secrets Store bindings are **deployed and mapped**: `CASHFREE_TEST_APP_ID` and `CASHFREE_TEST_SECRET_KEY`. Four existing runtime vars remain `sandbox`, `false`, `false`, `disabled`. Secret **values not shown**. No API request/charge/mandate/grant.
- Work on branch `fix/cashfree-sandbox-binding-config-sync-20261014` from main `d89389e7759cce02d05f56288740706958bfbace`. Updated only isolated `wrangler.cashfree-sandbox.jsonc` to match Cloudflare's `secrets_store_secrets` metadata (binding/store_id/secret_name), plus `tests/cashfree-isolated-worker.test.js`, docs/STATUS and docs/CASHFREE_SANDBOX_SECRET_SETUP.
- **Do not merge yet** until checking the permissions of the Cloudflare GitHub build token `mlos-web-builds`: Cloudflare docs require **Account Secrets Store Edit** to deploy a Worker binding through Wrangler; unknown if this existing CI token has it. Owner's manual dashboard binding authority is separate from CI. Avoid breaking the running staging deployment. Consider a separately restricted token for staging rather than granting public-web deploy token unnecessary scope.
- Feature PR and CI pending at this checkpoint; check exact PR/test status before proceeding. No cloud API actions, secret reads or real Cashfree test transactions by assistant.
- Next: create/update PR and run no-deployment GitHub CI; leave PR pending token-scope confirmation. Once permission is confirmed, merge then inspect Cloudflare build and ensure bindings persist on `mlos-cashfree-sandbox`. No scheduled diagnostics, HTTP routes, public checkout or premium access permitted. PhonePe alternative remains deferred; institutional work parked.

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
