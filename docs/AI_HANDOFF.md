# Current engineering handoff

Snapshot: 2026-10-13 (Asia/Kolkata). Verify remote evidence before resuming.

## Current task
- Checked at: 2026-10-13; objective is implementing the owner's attached navigation mockup (avatar Account, top Master Admin, contextual Study sidebar, expanded landscape / portrait overlay).
- Owner: ChatGPT/Codex active. One writer for feat/contextual-navigation-20261013; base main d80fd99d67afe250faad99375d6895233f6c02f7. PR #230: https://github.com/mdmoazzam291/Medical_Learning_OS/pull/230. Published code checkpoint: 15ac94e08c871e620130d05f5119ade7902a0a18; resolve the branch for latest head (later fix/checkpoint commits follow).
- Scope: web/navigation.js, navigation-view.js, navigation.css, library.js; src/domain/app-navigation.js, library-workspaces.js; account security anchors; Node/browser navigation regressions; README, decisions, status and plan. Other open draft branding/OAuth PRs are unrelated and untouched.
- Completed: approved runtime layout/navigation and Node regressions; 1,209 Node tests pass after independent-review fixes, checks and 77-file static build pass. Fresh desktop defaults expanded; existing explicit preferences preserved. Portrait drawer state is transient. Both palettes preserved.
- Independent review found subject context loss, hidden phone avatar labels and stale browser selectors; fixed in one pass with regression coverage. Cross-workspace duplicate pins also fixed. Run 38411778590 passed repository checks but both browser engines stopped on a new test selector matching body and button; narrowed the selector to button[data-rail]. Run 38412167806 exposed browser rotation waits reading the previous layout before the resize event. Browser waits now require the rendered inline/overlay mode, not only coincident rail state. Exact compact search breakpoint also has a RED→GREEN regression. Pending: fresh GitHub Chromium/WebKit browser acceptance and release verification. Local Chromium executable is unavailable. No hosted signed-in or physical iPad verification claimed.
- Authorization: implement and persist this navigation change. Routine feature checkpoints are authorized by AGENTS.md. No clinical publication, branding merge, backend/provider settings, data deletion or unrelated work.
- Next action: verify the branch head/PR and CI results; finish browser acceptance before claiming release. Update this record with code commit and concrete evidence.
- Previous checkpoint/continuity PR #227 is merged into current main; do not restart it.

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
