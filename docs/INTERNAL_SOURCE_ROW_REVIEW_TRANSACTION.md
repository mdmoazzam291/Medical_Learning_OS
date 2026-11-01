# Internal Admin source-row decision gate — disposable transaction experiment

**Status:** DRAFT, test-only; ADR-134 Option A. [#353](https://github.com/mdmoazzam291/Medical_Learning_OS/issues/353). This document describes a proof of a narrow internal review-event data path, **not a deployable Admin API, authenticated reviewer workflow, live database migration or approved clinical/source decision**.

## Composition and dependencies

- [#352](https://github.com/mdmoazzam291/Medical_Learning_OS/pull/352) supplies source-row package/case digest metadata, exact version-bound request preflight and ADR-134.
- `src/domain/internal-source-row-eligibility.js` evaluates **hypothetically trusted** server records for independent reviewer identity, current package-level read eligibility, case-specific active grant and source hash. It snapshots owned data before async hashing and returns `eligible` but **never** authenticated/committed approval.
- `ops/prototypes/source-evidence/internal-review.sql` and `scripts/internal-source-review-sql-check.js` exercise a separate **embedded PGlite** database schema `evidence_internal`. The test intentionally creates synthetic roles `anon`, `authenticated`, `service_role`, and a non-login `evidence_internal_gateway`. It uses only synthetic metadata and grants and never accepts an external database URL.
- Dedicated `internal-source-review-pglite` CI job is scoped to draft PR #354 only; it runs the role and transaction checks without access to hosted credentials.

## Internal decision transaction

1. Client constructs the exact `source-row-review-v1` request **without** publisher, rights or clinical flags; upstream domain preflight validates request and source digest.
2. A future **authenticated, private** service must independently bind the caller's identity to a reviewer, current account/runtime and qualified independent grant. **This identity transport is not implemented.**
3. The disposable gateway role may call `record_review(actor, request, grantEventId)`, but the gateway can currently **supply an arbitrary actor ID**. Its SQL role is therefore not an authentication proof and must never be exposed to a browser, learner, anonymous role or public RPC.
4. Inside the same SQL transaction, the function locks the current exact package and grant records, checks `staged`, active/allowed metadata rights, author exclusion, qualifying active case grant, and exact source/case/appearance digests.
5. It writes an immutable internal decision event with database-generated decision ID and timestamp and all four downstream approval flags false. Same actor + request ID + identical request/grant returns the exact original event; a mismatched payload conflicts.
6. `read_review(actor, requestId)` repeats current protected package/grant/source checks. Revocation/withdrawal prevents the event from being read despite its immutable historical persistence. The fixture's superuser can audit stored history.

**Event semantics:** `internal-source-row-decision-event-v1` is a private source-interpretation record, not a cryptographically signed external receipt. It does **not** imply the proposed medical interpretation is true, official syllabus coverage, copyright reuse rights, provider delivery, exam mapping or permission to publish. The previously defined `matchesSourceRowReviewReceipt` shape is not being represented as server-authenticated by this experiment.

## Tested and untested safety

Synthetic PGlite acceptance exercises direct-table and raw-function denial for browser/standard roles, gateway-only RPC, source/actor/rights checks, append-only event triggers, identical retry, mismatched request conflicts, case digest mismatch, malformed request denial, reviewer revocation, withdrawn package and protected readback. Unit tests also reject hostile object getters, wrong author and case grants, and mismatched current source hashes.

**Not yet proved:** native PostgreSQL concurrent revocation-versus-decision ordering; actual independent identity verification; authenticated least-privilege connection/session binding; immutable **grant history** (fixture toggles a mutable grant); SQL-side complete Unicode rationale policy; full source version/withdrawal/current-rights integration with the live datastore; managed backup/restore; real protected Admin UI; metrics/queue counts; legal/clinical review. The test-only security-definer owner has powers that a production service should not hold. This prototype must not be copied into hosted migrations unchanged.

## Next acceptance gate

Implement a real server-only identity binding and append-only grants/revocations, then test **two native PostgreSQL sessions** racing decision-vs-revocation and crash/restart. Require protected proof of persisted decision and no cross-account enumeration; integrate only with existing Admin review navigation after qualified, independent security/rights review, fresh exact-head CI, separate migration/rollout approval and a rollback runbook.

**No external evidence-delivery provider, signing keys or outbound gateway is needed under owner-approved Option A.** Private provider PR #350 remains DRAFT/unmerged, gateway OFF.
