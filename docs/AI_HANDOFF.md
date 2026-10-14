# Current engineering handoff

Snapshot: 2026-10-14 (Asia/Kolkata). Verify remote evidence before resuming.

## Current task
- Checked at: 2026-10-14 Asia/Kolkata, feature checkpoint. Owner authorized three ordered tasks: Q1 consumer entitlement foundation → Q2 responsive Sage/Lavender subscription page → Q3 Razorpay sandbox preparation with actual payments disabled.
- Branch: `feature/consumer-entitlements-plans-razorpay-sandbox-20261014` based on merged consumer commercial scope main as of commit `f12c796f74e2ea0a8aaad886a774691afe392c82`. Do not overwrite another writer's work.
- New code: `src/domain/consumer-entitlements.js`; `web/plans.html`, `web/plans.css`, `web/plans.js`; `src/adapters/razorpay-test.js`; three new test files. Existing `scripts/public-surface.js`, `web/navigation-view.js`, `src/domain/app-navigation.js` updated narrowly. Docs updated in this branch.
- Implemented as **no-runtime-authority foundation**: Free default; any premium grant requires trusted server source/subject/date AND separately enabled premium-release flag. Price status proposal_only. Pricing UI has no checkout; links from account avatar. Test adapter accepts ONLY test keys and explicit flag, not deployed/wired; webhook verifier returns inert receipt and cannot grant paid access.
- Verification at this checkpoint: connector file write/readback complete; full Node/check/build/browser and Razorpay provider sandbox have NOT been run. Do not claim successful live payment or production release. Existing PR #211 auth/preview unresolved independently.
- Pending: create feature PR, allow CI, inspect failures; do not merge if checks fail. A production payments release is NOT authorized. Institutional model remains frozen in private Drive Governance, not active development.
- Exact next action: compare focused diff, run CI verification when available, reconcile before merging. Any later real billing needs content-rights readiness, backend authenticated grant issuance, durable idempotent ledger and separate explicit go-live decision.

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
