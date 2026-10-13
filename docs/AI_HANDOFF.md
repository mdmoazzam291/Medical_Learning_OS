# Current engineering handoff

Snapshot: 2026-10-14 (Asia/Kolkata). Verify remote evidence before resuming.

## Current task
- Checked at: 2026-10-13T23:30 UTC / 2026-10-14 Asia/Kolkata. Owner approved direct implementation and Q3 tablet rotation/desktop/saved-appearance acceptance.
- Owner: ChatGPT/Codex active; one writer. Branch docs/final-navigation-glass-option-20261014; base/main 926e150277aced9627c4d85b4f787becd5a99783; PR #233 draft. Actual API code/test checkpoint 5767fbee627f832078116baaa8cbd6f568210c84; local d2b5d84 has identical tree 7b202e0dee7867f844c9da53d95b684a27dfe392. Verify current remote PR head; subsequent handoff-only commits may follow.
- Tasks 1–3 complete: independent validated Standard/Glass migration, full catalog-centered top/contextual menus with no permanent tablet/desktop sidebar, original phone flow, Preferences surface selector and selected-palette navigation Glass with opaque reading surfaces. Account tools and icon search retained.
- Fresh read-only whole-branch review found three focus lifecycle bugs and one wrong current-workspace marker; all reproduced RED→GREEN and fixed. Whole Node suite 1226/1226; 77-file build and repository checks pass. No deferred minor findings.
- Task 4 browser acceptance remains pending. Initial Chromium/WebKit runs found stale resize measurement, a test helper toggling the target disclosure twice, and assertions reading text from a closed menu; harness now waits for correct DOM, opens ancestors only and inspects visible menus. New browser checks cover review fixes, full rendered catalog, all 8 appearance combinations, bounded nested scrolling and screenshots.
- Exact next action: inspect Foundation jobs for current pushed code, fix demonstrated code/test integration failures, rerun Chromium and iPad WebKit acceptance, inspect actual screenshots, then final STATUS/ADR/spec/plan/handoff checkpoint and mark PR ready. No second reviewer is needed; all four findings have failing-first tests and a green suite.
- Local Chromium launch is blocked by the execution environment's Unix socket permission; WebKit lacks system dependencies. Use existing GitHub CI and do not infer browser success from static tests. Synthetic browser fixtures do not establish physical iPad verification.
- No production merge/deploy, content/learner-data or backend/Auth/provider writes. Issue #211 non-production preview failure and unrelated OAuth/PARSE drafts remain separate. Ledger/briefs in dedicated checkout record Tasks 1–3 and final review; preserve pending Task 4 state.

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
