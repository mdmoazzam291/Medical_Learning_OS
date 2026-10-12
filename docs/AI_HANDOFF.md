# Current engineering handoff

Snapshot: 2026-10-12 (Asia/Kolkata). Verify remote evidence before resuming.

## Current task
- Objective: portable continuity between ChatGPT/Codex and Claude, including starter prompt and switching rules.
- Owner: ChatGPT/Codex preparing the documentation PR. Do not concurrently edit this task branch; transfer only after this active run ends.
- Branch: docs/ai-continuity-20261012; base main commit: 415942e7d8b370e6c49c015d80d32acc78d29634.
- Current head: resolve from git/GitHub; do not use this base SHA as the task branch's final commit. A file cannot contain its own final commit hash without changing it.
- PR/release: documentation publication pending; verify GitHub before continuing.
- Changes: AGENTS.md, CLAUDE.md, README.md, PROJECT_CONTEXT.md, STATUS.md, DECISIONS.md; AI_CONTINUITY.md, AI_ENVIRONMENT.md, AI_STARTER_PROMPT.md, this handoff and four docs/workflows/ snapshots.
- Verification: fresh 2026-10-12 local npm test passed 1,200/1,200; npm run check passed syntax/catalog/decision checks; npm run build:pages produced 77 files; git diff --check and portable-document link/import/ADR checks passed. No fresh authenticated hosted or physical-iPad test was performed for this documentation-only change. GitHub CI remains pending publication.
- Unfinished work: validate documentation/checks, push focused PR and inspect CI/merge state.
- Next action for this task: finish that PR; do not restart theme or Admin implementation.

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
