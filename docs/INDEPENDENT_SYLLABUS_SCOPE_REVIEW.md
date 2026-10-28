# Independent syllabus-scope review: authorization and immutable receipts

**Engineering state:** stacked draft PR #337 based on #336 → #335 → #334 → #333 → #332. Source only, unmerged and undeployed. No independent reviewer account has been invited, authorized or asked to approve anything.

## Boundary

The singleton Content Admin authors a proposed canonical-concept checklist and may assign an **existing, distinct authenticated user** as an independent scope reviewer. That user is not made a Content Admin or medical/rights reviewer. A grant applies to one baseline ID, not to all exam content. Grant and revoke events are append-only; the newest event for a reviewer/baseline controls access. The owner cannot assign themself or the proposal author.

The reviewer signs in through the existing Supabase Auth and session/runtime gates to access a private review endpoint. They can inspect only the assigned exact baseline and record a single immutable decision for an exact revision/digest. The review includes a separate evidence locator and reviewer-declared SHA-256 of the independent source document, a substantive review note and fixed attestation version. Reviewer identity, grant event, catalog/registry versions and recorded time are server-bound. Uncertain retries use the same request ID and original payload. Source hashes are declarations; the platform does not fetch, hash or verify external evidence.

Supported decisions are `scope-reviewed` and `changes-required`. Neither decision attests to **official syllabus completeness**. A reviewed candidate checklist remains in draft storage and **cannot** activate the Preparation Curriculum, create objective mappings, affect the Digital Twin/Study Now or release a learner-facing item. A `complete-proposed` checklist can at most obtain a reviewed-scope receipt—never an official syllabus completeness certificate. For broader exam certification, source specificity and independent completeness validation are still required.

## Endpoints (implementation, not deployed)

- Owner: `POST /owner-api/syllabus-reviewer-grants` with exact `requestId`, `baselineId`, `reviewerUserId`, `action` (`grant`/`revoke`) and `reason`. Existing owner singleton + runtime checks precede the service-only RPC. The reviewer user ID must exist in Supabase Auth.
- Reviewer: `GET /review-api/syllabus-scope-review/:baselineId?revision=N`, returning only the authenticated reviewer's granted proposal and any prior receipt; `POST /review-api/syllabus-scope-review/:baselineId` records the exact decision. It authenticates the reviewer directly, not through owner privileges.
- SQL RLS/revokes prevent direct `anon` or `authenticated` table and RPC access; app secrets stay server-side. Source scope review never authorizes the existing clinical, rights or question publication actions.

## Validation and release gates

The repository includes domain input validation, API actor/permission tests and disposable PostgreSQL tests for grant/revoke, forged actor denial, unknown users, self-review, version drift, immutable receipts, exact retry, already-decided conflict and unchanged catalog. Run core, Chromium and native WebKit checks on the **exact PR head**; a passing source test is not a production auth/security review.

Before approval, review SQL and API code independently, especially role scoping, Auth membership, cross-account access denial, concurrent grant/revocation and request retries. Real hosted session tests and backup/restore rehearsal must be completed after parent migration deploys. The Admin grant and reviewer decision APIs are the backend foundation; a small, protected grant/reviewer UI, evidence upload/verifiable hash and institutional reviewer governance remain later increments. Granting a different user ID alone cannot prove institutional independence or professional competence.

**No migration was run in production and no actual reviewer grant or scope decision was recorded.** Clinical rights issue #326 is unaffected.
