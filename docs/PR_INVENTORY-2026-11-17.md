# Open-PR inventory — 2026-11-17

Checked against `main` at 2026-11-17T16:30Z. 76 open PRs (71 drafts). Every one is 300–1,150 commits behind `main`, and none of their added files exist on `main`. **Closing a PR does not delete its branch**, so the work stays recoverable; nothing below asks for a branch deletion.

Nothing has been closed. Each group needs the owner's explicit approval before any action.

| Group | PRs | Count | Why | Recommendation |
|---|---|---|---|---|
| A. Status/docs reconciliation | 264, 288, 320, 325, 375 | 5 | Release/status notes from Oct–early Nov; superseded by the 2026-11-17 STATUS/AI_HANDOFF rewrite and archive. | Close |
| B. NMC source-audit research stack | 343, 344, 346, 348, 382–406, 412, 420 | 31 | Stacked evidence/audit work on the NMC PDF. Superseded by the merged catalogue, overlay and registry @25. Evidence files remain on the branches. | Close |
| C. Internal source-review / staging-auth security stack | 350, 352, 354–374, 376 | 24 | Reviewer-grant, JWT revocation and staging harnesses for a multi-reviewer workflow. Faculty review is skipped, so this has no current user. | Close; revisit if human review returns |
| D. October Admin workflow designs | 318, 330, 331, 337, 339–342 | 8 | Evidence-selection and approved-collection designs; superseded by concept batch review and the coverage index. | Close |
| E. Unscheduled learner features | 377, 378, 379 (learner code), 380 (PWA), 381 (account) | 5 | Real feature work, not superseded, but unscheduled and ~850 commits stale. | Close now; restart from `main` when scheduled |
| F. Owner decision | 203, 228 (PARSE brand docs and rebrand), 229 (Google OAuth localhost-redirect test + doc) | 3 | Brand is a product decision. 229 is small; check whether the guard it tests still matters. | Owner decides |

Total: 5 + 31 + 24 + 8 + 5 + 3 = 76.

Suggested approval wording: "Close groups A–E" (73 PRs), with a separate answer for group F.
