# Internal source review — real local Auth JWT and session transaction acceptance

**1 November 2026 — isolated, disposable experiment; DRAFT only.** Owner-approved ADR-134 Option A (internal Admin review). Builds on #359 (real PostgREST verifying test JWT but synthetic session) and #360 (real local GoTrue session locks but a privileged test caller passed the actor ID). Neither is a deployed feature.

## Combined trust boundary under test

The migration-free local Auth stack runs genuine GoTrue, PostgREST and PostgreSQL, serving only loopback. A disposable random user signs up through GoTrue and receives a real access token. The local Auth SDK calls `getUser(token)` to verify the current user. That same token is passed to PostgREST at `/rest/v1/rpc/mlos_internal_source_review_local_v1`. The SQL function accepts **only the canonical review request**; it derives actor via `auth.uid()` and session ID via `auth.jwt()->>'session_id'`, which represent claims verified by PostgREST, not a browser-provided actor/grant ID.

Inside **one transaction**, the test-only function:

1. Takes `FOR SHARE` on the **actual** GoTrue-managed `auth.sessions` row matching the signed JWT user/session ID and checks expiry. This serializes with actual GoTrue local sign-out.
2. Resolves a unique case-scoped synthetic reviewer grant for the exact package/version/digest/case and checks its append-only current grant journal, then locks the grant.
3. Invokes the existing version/digest/source-rights/independent-author/qualified-review guard and immutable idempotent decision event writer before the transaction commits.
4. Exposes protected readback with a fresh session and grant check. Nothing sets clinical, rights, exam-scope or learner-publication flags.

The acceptance exercises two independent valid GoTrue users, tampered signature, unsigned access, cross-user impersonation, fabricated body actor/grant IDs, exact concurrent retry, changed retry rejection, protected readback, live sign-out racing an in-flight review and a new legitimate session denied after a synthetic grant revocation. The fixture contains a one-request `pg_sleep` barrier to observe the sign-out ordering reliably; this alone makes it **unfit for hosted deployment**.

## Critical remaining limits

- **The SQL is owned by a privileged disposable local role.** It reads provider-owned `auth.sessions`; this does **not** establish any managed project's permission, provider support for locks, or compatibility with production Auth schemas. Do not change the managed Auth schema/ACLs/roles or deploy the test function unchanged.
- A user-scoped JWT verified by local PostgREST is not proof of the real MLOS project's signing-key configuration, issuer/audience rotation, `getUser` implementation, account bans, MFA requirements, or hosted session revocation.
- Synthetic reviewer grants are inserted by a local database administrator, not by an independently authorized/qualified clinical or source reviewer. The append-only test journal has no production issuance/revocation policy or actual source-rights evidence.
- The underlying test event shape `internal-source-row-decision-event-v1` is not yet bound to #358's canonical `source-row-review-receipt-v1` contract. Passing a shaped response is not enough to establish real protected, durable clinical/rights decisions.
- The fixture is connected neither to a live `review-api` endpoint nor to the Admin action inbox. The external provider dispatch gateway stays OFF; #350 remains deferred.

## Remaining acceptance sequence

**Next:** inventory true nonproduction managed Auth/session privileges and application review-api current access semantics *read-only*. Design a least-privilege session-state bridge (officially supported direct row locking if allowed; otherwise private revocation ledger with measured consistency). Govern grant issuance and immutable transitions. Verify PostgreSQL native concurrent session/grant mutation, backup/restore and source-rights readback. Independently review SQL definer ownership, JWT verification settings, session identity and negative roles. Then seek explicit approval before any hosted migration or real Admin UI.

**No production change, hosted credential, learner data, actual source adjudication, merge or release is authorized by this document or the CI.**
