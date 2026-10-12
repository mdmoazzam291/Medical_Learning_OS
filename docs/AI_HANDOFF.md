# Current engineering handoff

Snapshot: 2026-10-13 (Asia/Kolkata). This is a task checkpoint, not proof of passing CI or deployment.

## Current task
- Objective: implement PARSE visual rebranding in the existing application, preserving approved palettes, behavior, technical identifiers and rights gates.
- Owner: ChatGPT (this run), release writer ownership on completion; task branch `feat/parse-preview-brand-20261013` from main `d80fd99d67afe250faad99375d6895233f6c02f7`. The former checkpoint/continuity task was merged in main (#227); do not restart it.
- Status: feature-branch UI code, labels, provisional vector glyph/icon, tests and documentation committed through GitHub connector. Draft PR **#228** opened (https://github.com/mdmoazzam291/Medical_Learning_OS/pull/228), remote branch head checked at **3b960c6b4063cd338bf5d92c7066d9f3c3b0ac90** after favicon completeness fix; PR reports mergeable. GitHub workflow **38321410601** reported pending, with no jobs returned when checked; build/browser/Node results are not claimed. No merge or deployment.
- Changed code: `web/brand.js`, shared nav/UI styling, signed-out landing, favicon, `web/*.html` public titles/meta, Home/Account/Admin/OAuth display copy, `scripts/public-surface.js`, `tests/parse-brand.test.js`.
- Constraints: Sage Precision default and Lavender Precision retained; light/dark and device prefs independent. Do not change Auth/OAuth URLs, Cloudflare/Supabase names, navigation paths, saved `mlos-*` browser keys, question content, clinical review or learner state.
- **Unresolved brand gate:** PARSE naming clearance in India and intended future markets is incomplete. See `docs/PARSE_BRAND_CLEARANCE.md`. No public deployment or final trademark/logo claims without clearance.
- Verification: manual source/markup checks and exact favicon links across 13 entry pages (content-import corrected). Full Node tests, repository checks, browser/CI and authenticated hosted checks **not verified yet**. CI pending at checkpoint. Do not claim green.
- Next: inspect head and PR checks, repair any failures, test phone/tablet/desktop and WebKit in both palettes/appearances, then retain PR unmerged until legal clearance and separate public-release authorization.
- Earlier docs-only PR #203 remains open/nonmergeable and is superseded in scope by this implementation branch, not yet closed.

## Continuity
Consult `AGENTS.md`, `docs/AI_CONTINUITY.md`, `docs/STATUS.md`, `docs/BRAND.md`, and the current PR before changing code. Read the remote branch head, not merely this snapshot. Keep one task writer; checkpoint WIP and preserve failed/unrun test states. No automatic monitoring or background execution is implied.
