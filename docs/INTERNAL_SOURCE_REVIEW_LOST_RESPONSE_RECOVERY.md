# Internal Admin source review — lost-response recovery by protected readback

**1 November 2026 — ADR-134, issue #353.** DRAFT/test-only and stacked on #363.
No managed database change, production endpoint, real reviewer, source approval or learner release.

## Failure addressed

A review writer may commit its immutable event while the response is lost in transit.
The client cannot decide that a timeout means "no record" and repeat the decision;
a session or grant may also be revoked between write and recovery.

The only permitted recovery path is:

1. Retain the exact original request identity and metadata (especially `requestId`,
   package/case versions and digests, original rationale and disposition).
2. Revalidate that unchanged request, then perform a current-session/current-reviewer
   preflight. A failed preflight must not expose even a receipt candidate.
3. Call a separately authenticated, user-scoped **read-only** endpoint for the
   original request ID. Never submit another review decision from recovery.
4. Validate its returned immutable event against the exact original request and
   expected reviewer. Project a canonical JCS/SHA-256 receipt candidate using
   the preceding #363 parity contract.
5. If readback fails, denies, is unavailable, is absent or mismatches, preserve
   **indeterminate** status. Do not infer the previous write did not commit.
   The caller must not automatically retry. An authorized human may initiate a
   separately audited resolution using the original request ID.

`src/domain/internal-source-row-readback-recovery.js` implements a narrow,
dependency-injected, fail-closed *offline contract* with exactly one read per
explicit call and **zero possible writes**. Reuses #358's preflight parser and
#363's event-to-receipt projection. It returns
`readbackShapeMatched:true` and a `candidateReceipt` only for exact-shaped
events; `ready`, `transactionVerified`, `persistenceVerified`,
`authorityVerified`, `decisionRecorded`, `safeToResubmit`, and all
downstream release flags are always false.

| Observation during recovery | Safe conclusion |
| --- | --- |
| Invalid original request / token | Do not read or write |
| Revoked/failed preflight | Do not read or write; prior commit status remains unknown |
| Protected read unavailable/denied | Indeterminate — no automatic retry |
| Protected read absent | Indeterminate — no automatic retry |
| Retrieved event differs from request/reviewer | Reject candidate, escalate integrity issue |
| Exact event shape matches | Candidate receipt only; no proof of signed origin, durable SQL or approval |

## Verification

- New core Node tests cover zero-write behavior, original-request preservation,
  forged authority, source identity/decision mismatch, revoked grants, lost
  readback, malformed requests, and caller mutation during async preflight.
- The **disposable real-GoTrue + PostgREST** acceptance script on this branch
  adds a scenario where the app holds only the original request after a
  previously committed event. A separate current-token protected readback
  reconstructs a receipt candidate with the same decision/grant ID and
  proves no second event is written. A foreign valid JWT cannot read it.
- PR #364 adds one opt-in to the existing isolated local GoTrue CI acceptance (alongside PRs #361 and #362).
  It uses synthetic temporary identities and a disposable test database,
  not the actual MLOS Supabase project.

## Still blocked

A real server integration needs verified user-bound readback, independently
reviewed current session and scoped-grant transaction semantics, explicit
grant issuer/qualification/independence policy, authoritative persisted
receipt/digest verification, ambiguous-commit recovery across restart and
backup/restore, negative roles, and a managed Auth privilege/consistency
assessment. `auth.sessions` row locking in the fixture must **not** be copied
to hosted Supabase without documented support and independent security review.

A valid offline receipt is not authorization or evidence of a qualified human
adjudication. PRs #352–#364 stay draft/unmerged until explicit release approval.
The external provider proposal #350 remains OFF; medical, rights, exam-scope and
learner publication decisions remain independently blocked.
