# Current engineering handoff

Snapshot: 2026-10-14 (Asia/Kolkata). Verify remote evidence before resuming.

## Current task
- Checked at: 2026-10-14T05:29:33.595033+00:00. Owner authorized the existing GitHub-connected production route. ChatGPT/Codex completed PR #233 integration and bounded release verification; no competing writer.
- Released code: PR #233 merged as 6913872a2222650fbfd1ef4cfc0887bee91741df from reviewed head bdafa8627ae68d53aed984cb8ebc0c515510e2b2. Receipt branch docs/navigation-release-receipt-20261014 starts from that merge; verify its remote head/PR on resume. Documentation-only checkpoint commits may follow; runtime is unchanged.
- Both Cloudflare production builds passed: learner web bc235da1-128d-4e7f-99e3-66c634e29fcc; heartbeat e5708e62-a369-4ff2-8487-b4568702a72f. Main Foundation run 38516083659 passed check, Chromium and iPad WebKit. Fresh local merged-tree Node suite: 1226/1226.
- Actual live public acceptance confirmed centered top navigation, no permanent contextual sidebar, full 19-subject index, independently expanded Anatomy/Physiology groups, search reveal, dark reload persistence and signed-out Admin/learning gates. Verification browser restored to Light. See docs/releases/2026-10-14-centered-navigation-release.md for exact scope and limits.
- Hosted real-account Glass switching remains unverified: browserAuth returned locator_invalid for the visible MLOS form. No authenticated learner session, answer or learner-data mutation was created. CI covers all eight appearance combinations with synthetic fixtures; physical iPad verification remains separate.
- Preview-build repair remains open in Issue #211. Cloudflare dashboard GitHub OAuth failed after mobile approval; direct email/password login returned API HTTP 403. Root cause of login and failed preview build remains unconfirmed. Production success does not resolve previews. Do not repeat sign-in indefinitely or change provider/security/preview-model settings speculatively.
- Exact next action: verify actual-account Glass/Standard and persisted palette/appearance when authorized sign-in is usable. Investigate preview failure via authorized provider logs or user-scoped Builds API access. No additional backend/Auth/content changes are required for this navigation release. Final polished material remains the next product input under existing governance.

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
