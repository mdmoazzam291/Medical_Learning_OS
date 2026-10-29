# Read-only syllabus review preflight release — 30 October 2026 IST

PR #336 merged at `91a11aff41048984b039fd269a2a0a9ddc3d99da`, guarded against tested candidate `12b2ab36342e88f7925c84eeb2e32bb69f6c6d38`. Both trees are `fb0a76a5a2f9f1792be0465cd6c9ff6a3b143968`.

## Delivered and verified
- Admin-only, read-only review of an exact private syllabus proposal, frozen identity bindings and reviewed objective mappings. No curriculum activation or inferred syllabus percentage.
- Reviewed migration `20261029202701/admin_syllabus_review_preflight`: exact SQL comparison returns true; anonymous/authenticated direct RPC execution denied, service execution allowed.
- Owner API v15 ACTIVE: 19/19 source files match. Review API v31 ACTIVE: 2/2 match. Exact PR336 preview origin only; existing Auth, runtime and Admin checks retained.
- Independent source review found no important issue. Local 1,548 Node tests, static checks and 124-file build pass.
- Candidate Foundation `40950505473`: core, Chromium and native iPad WebKit completed SUCCESS. Both syllabus and preflight checker UI suites pass in both browser engines.
- Genuine Admin browser: anonymous GET/invalid POST 401, missing baseline 404, invalid revision 400, write attempt 405. Separate genuine learner: anonymous 401 and learner GET/POST 403. Independent Owner v15 logs confirm TWO distinct authenticated subjects. Fixed missing UUID/invalid requests only; no valid draft submitted.
- Production has no syllabus drafts, so no real populated-packet HTTP 200 is claimed. Positive packet/private-binding/version cases pass in isolated SQL/API/browser fixtures.
- Fresh recovery `40950505664`: backup and disposable restore SUCCESS, archive `supabase/2026/10/29/20261029T203630Z`. All 75 public tables / 108 COPY exports match, including Auth, foreign keys, exact access and encrypted named Vault provisioning. Cleanup passed. No production restore or provider failover.
- Production builds SUCCESS: web `2cc780f0-2a09-4026-90a8-ebb83e419035`; heartbeat `57eaf9d6-decf-4996-808b-8d5e49ad343b`; existing isolated sandbox `f4f7f612-c4ff-4536-bf9a-a1c121e0f549`. Sandbox build does not activate payments.
- Main Foundation `40952743662` core passes; repeat browser/WebKit were still running at receipt. Exact candidate-tree browser success is established. Public production homepage renders; no new authenticated production editor or direct served-asset byte equality claim.
- Database after merge: zero syllabus drafts, zero private concept acceptances, learner catalog v446.

## Corrected engineering failure
Initial candidate `2e29a00` core CI caught a truncated repository upload of the large Review API source. Production Review v31 was intact. Candidate `12b2ab3` restores the complete source; all nine changed file Git blob hashes match local source. Failed/cancelled earlier CI is not counted as success.

## Boundaries and continuation
No reviewer grants, official syllabus certification, clinical/rights decisions, valid checklist writes or learner publication. Preserve #326 and #330. Prior compatible Owner v13 / Review v30 and frontend source remain rollback references; database restoration requires a separate loss assessment.

Next is PR #337. Its source remains unreleased and must be reconciled non-forcibly with main `91a11af`, preserving the JSONB confirmation fix, exact preview controls and read-only preflight. Require fresh source/SQL/browser review and genuine authorization/revocation acceptance before deploying reviewer security functionality. Do not provision or approve an independent reviewer on the owner's behalf.
