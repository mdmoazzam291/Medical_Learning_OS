# Internal source-row review — authenticated transaction handoff contract (offline)

**1 November 2026 — draft, not a live Admin API or deployable database migration.**

ADR-134 / issue #353. This review-only increment stacks on #357; none of #352–#358 is merged or deployed. External provider #350 remains deferred and OFF.

## Problem that cannot be hidden by passing fixture tests

#356 proves that dedicated native PostgreSQL reviewer LOGIN roles can bind `SESSION_USER` and serialize grant/revoke decisions. But **Supabase Edge review-api** normally uses an API connection pool and a JWT-bearing user session, not per-reviewer PostgreSQL LOGIN credentials. The test-only SQL `record_review(p_actor, ...)` accepts an arbitrary actor parameter, while the existing real review API uses a service key for privileged SQL RPCs. Neither the old actor-parameterized fixture nor passing `getUser` in app code makes the actual database transaction independently trust the human reviewer.

A truly trusted source adjudication must derive the reviewer from an identity-provider-verified database request context, **never** from a browser-provided `reviewerId`, copied `sub` claim or a privileged RPC `p_actor` parameter. A separate database authorization check must serially recheck current session, scoped qualification/independence grant, source status, rights and version/digest immediately before the immutable event write.

## This PR's strictly non-authoritative implementation

`src/domain/internal-source-row-transaction-handoff.js` accepts:
- `preflight(token,request)` — the future, server-controlled exact canonical request + `getUser` + runtime+current evidence check; reuse #357.
- `commitAsUser(token,request)` — **not implemented here**, an independently reviewed user-token-scoped DB transaction adapter. Do not use the privileged `service_role` or old `record_review(p_actor,...)` SQL to implement this. The RPC signature should accept only the exact review request, derive reviewer identity from a **server-verified user-scoped DB context**, and lock/recheck grants, source and session state within its authoritative transaction.

The new helper:
1. Validates/captures the canonical request synchronously (before any async call).
2. Rejects invalid token/request, non-current Auth/session/grant state and any preflight output claiming an already-recorded decision.
3. Calls `commitAsUser(token,capturedRequest)` **at most once**, with no actor or grant ID supplied from the request.
4. Checks the returned receipt against the existing `matchesSourceRowReviewReceipt` contract and the verified reviewer ID.
5. Returns **`transactionVerified:false` and `decisionRecorded:false` even for a perfectly shaped receipt**. Shape matching is not proof of protected event readback, persisted source approval or cryptographic receipt origin. Network errors after an ambiguous commit are fail-closed and not retried by this helper.

`tests/internal-source-row-transaction-handoff.test.js` rejects forged identity/privilege fields, absent or revoked preflight, malformed or foreign receipts, unauthorized publication claims, ambiguous network results and caller-side input mutation.

## Real authorization and storage requirements BEFORE any live endpoint

**Recommended direction to evaluate:** a dedicated least-privilege user-scoped PostgREST RPC (not exposed as a general anonymous/public method) that uses `auth.uid()` derived from a JWT actually verified by PostgREST, **plus a same-transaction current session/grant check**. The Edge function still verifies `getUser(token)`, current session, role/rights and request origin before invoking it using an authenticated user-scoped client. A service-role client must not pass an arbitrary `p_reviewer` into a SECURITY DEFINER function and assume the application preflight removes revocation races.

This direction is a **proposal, not deployed or proven**. It requires independent review of:
- JWT signature verification at the DB gateway, project issuer/audience and `auth.uid()` provenance; merely `SET request.jwt.claims` in a local SQL test is *not proof*.
- Current session ID/revocation and account restrictions within the transaction, with compatible pooling/session semantics; do not trust an unverified decoded JWT claim.
- Target-scoped grant *issuance* and one-way revocation journal, reviewer independence/qualification, explicit rights and source status, and deterministic lock order.
- Exactly-once request/actor idempotency, immutable event IDs/digests and consistent protected readback after commit and after session revocation; a signature/digest alone does not establish human approval.
- Dedicated SQL privilege/RLS/access restrictions, rate limiting, managed backup/restore, cross-account test fixtures and network-failure tests.

No new external email, receipt delivery service, signer or private provider trust key is required under owner-approved internal workflow. No learner release flag may change because of source-row adjudication.

## Release status

**Preflight and handoff contracts only.** No usable `commitAsUser` implementation, no trusted live authenticated PostgreSQL RPC, no qualified reviewer records or independent source permissions, and no Admin UI action are added in this PR. Keep draft; no merger, production migration or deployment based solely on this work. The source-review release ledger remains `docs/INTERNAL_SOURCE_REVIEW_RELEASE_LEDGER.md`.
