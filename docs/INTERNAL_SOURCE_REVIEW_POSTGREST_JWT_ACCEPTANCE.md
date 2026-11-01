# ADR-134 — Real JWT-to-PostgreSQL transaction acceptance (isolated prototype)

**1 November 2026. DRAFT / NON-DEPLOYABLE.** Independent database-identity gate in issue #353. Based on #358. No live Supabase Auth, clinical/source approvals, hosted migration or API endpoint is introduced.

## Problem advanced

The #356 fixture proved user identity using dedicated PostgreSQL LOGIN accounts; actual MLOS uses Supabase Auth bearer JWTs and a pooled PostgREST/RPC boundary. #357–358 added server preflight and user-scoped handoff contracts, but not an independently verified JWT-to-SQL transaction. This slice tests a **real JWT-verifying PostgREST process**, with isolated PostgreSQL 17 and 18, using wholly synthetic, locally signed keys, identities and source-row metadata.

## Exactly what was built

- `ops/prototypes/source-evidence/internal-review-postgrest-jwt.sql` adds an isolated `evidence_api.record_source_review(q)` and `read_source_review(p_request)`. Neither accepts `p_reviewer`, `p_actor` or a client grant ID. Transaction-local `auth.uid()` and `auth.session_id()` obtain the `sub` and `session_id` from `request.jwt.claims`, injected **only after PostgREST verifies signature, audience and role**.
- An exact session row is locked and checked for active status and reviewer binding. The exact versioned package/source-rights row, qualified case grant and append-only current grant history are then locked/checked before invoking the existing immutable idempotent decision insert in the **same SQL transaction**. Protected readback repeats current session/grant/rights checks.
- `scripts/internal-source-review-postgrest-jwt-check.js` tests real signed HTTP JWT calls. The CI matrix seeds isolated data and starts the **official PostgREST v14.18** Docker image against disposable `postgres:17` and `postgres:18`. Tests reject anonymous calls, bad signatures, wrong audience, expired or anonymous role, foreign subject, unknown session, forged reviewer/grant fields. They prove one event for concurrent retries, protected readback, conflict and revocation denial without deleting immutable history.

## Exactly what this does NOT prove

- PostgREST accepts a signed JWT with a **synthetic fixed test secret**. This is not a real Supabase-issued JWT, GoTrue session validation, real production issuer/audience/key rotation, account ban enforcement or hosted service. A privileged SQL connection can forge `request.jwt.claims` with `set_config`; direct DB connection must remain unavailable to users.
- The fixture's current session table is synthetic, seeded by a privileged local administrator, and **not wired** to the existing `learner_runtime_access_v1`/hosted Auth state. A revoked Supabase session could still be accepted if this separate state were stale. This is a critical unclosed production blocker.
- The fixture's grant history issuance is synthetic; a human reviewer is not independently qualified, assigned or authorized by a governed real system. The old immutable event format `internal-source-row-decision-event-v1` differs from the source review receipt shape in #358, so **no claim of a connected production `commitAsUser` or final receipt** is made.
- This is not a real source/rights adjudication. It never turns `sourceReviewOnly` into rights, medical, exam-scope or learner-release authorization. Clinical and copyright review remain separate.

## Before production integration

1. Verify actual Supabase JWT signature/issuer/audience and live GoTrue session in an isolated hosted environment. Reuse existing `review-api`'s verified `getUser(token)` / runtime access rather than building another identity scheme.
2. Agree how a **database-enforced session revocation** maps to the existing authoritative session source atomically under a pooled user-scoped RPC; avoid a stale duplicate session table.
3. Implement governed, audited issuance/revocation of exact qualified source-row grants and immutable reviewer decisions in a reviewed least-privilege schema, using trusted transaction locks.
4. Verify lost acknowledgement / idempotency, native concurrency and recoverability plus protected source-rights readback; independently review the SQL `security definer`, ownership, RLS and role grants.
5. Only after explicit owner migration/deploy authorization wire a private Admin endpoint and existing review queue; never auto-publish.

No external evidence-delivery provider is required by accepted ADR-134 Option A. PR #350 remains deferred; gateway OFF.
