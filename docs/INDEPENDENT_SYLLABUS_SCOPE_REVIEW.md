# Independent syllabus-scope review: authorization and immutable receipts

**Engineering state:** draft PR #337 integrated against the released `main` baseline through PR #336. Source only, unmerged and undeployed; reviewer-function deployment and independent human identity acceptance remain blocked. No independent reviewer account has been invited, authorized or asked to approve anything.

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

**No migration was run in production and no actual reviewer grant or scope decision was recorded.**

## Production Auth permission compatibility repair (30 October 2026)

A read-only live permission probe confirmed `service_role` does **not** have `SELECT` privilege on `auth.users`. An earlier disposable SQL fixture incorrectly granted that privilege and hid a guaranteed production failure in grant validation. The corrected Owner API checks reviewer existence server-side with `admin.auth.admin.getUserById()` before new grant requests, fails closed if Auth is unavailable, and allows revocation even if the reviewer account has been deleted. The service-role SQL grant RPC no longer queries Auth tables. The synthetic PostgreSQL fixture explicitly denies direct Auth table reads, and the API tests cover an existing user, unknown user, mismatched user ID, Auth outage, and revocation. This check proves account existence, **not** professional independence or consent; reviewers must still be separately authorized by the owner before any real grant.

The integration migration file is ordered **after** the applied production preflight migration: `20261030020000_syllabus_independent_scope_review.sql` (the earlier `20261029012000` filename was stacked before the actual release). No applied migration has been renamed or rewritten. Clinical rights issue #326 is unaffected.

## Reviewer-scoped private identity repair — 29 October 2026

The earlier reviewer target exposed the draft's concept IDs without the frozen meanings of Admin-accepted, unpublished identities. That made an independent `scope-reviewed` attestation ambiguous after PR #334/335's privacy separation. The repaired **service-role, grant-scoped** target now provides `privateIdentities` only from the exact requested baseline revision's immutable `private_identity_bindings`. Each projected identity contains the accepted concept ID, SHA-256 identity digest, label, aliases and classification, and is returned **only after the reviewer grant and author-exclusion checks**. Other baseline IDs, revoked reviewers, self-reviewers and normal learner requests remain denied. The identity is not copied into `study_catalog` and no public Data API privilege is introduced.

The SQL inspect RPC emits `privateIdentityVerified`; for missing/mismatched bindings it sets `canReview:false`. Independently, the SQL decision RPC revalidates every private binding and the current published catalog **at decision time**, under the existing publication coordination lock. It refuses a positive `scope-reviewed` attestation with `syllabus_scope_private_identity_unverified` if any private identity is stale or missing. A scoped reviewer can still record `changes-required` and document the discrepancy. Author/reviewer signatures, source evidence, exact proposal digest, registry version, and immutable decision receipt remain separate. This does **not** count private concepts toward approved curricular mappings, certify syllabus completeness, authorize clinical/rights review, or publish content.

Disposable PostgreSQL testing must prove exact frozen private meaning is visible to the assigned reviewer *only*, other reviewers and learner DB roles cannot access it, digest mismatch blocks positive attestations, a correction decision remains possible, and the catalog remains unchanged. Source tests and mock browser checks do not establish real hosted authentication or source reviewer professional independence. Final hosted role/session and restore tests are still mandatory before release.
