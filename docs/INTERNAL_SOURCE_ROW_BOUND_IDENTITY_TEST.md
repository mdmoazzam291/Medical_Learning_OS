# Internal source-review authenticated-session fixture — security review only

**Scope:** issue #353, owner-approved internal Admin review (ADR-134). Stacked on the non-deployable native concurrency review #355. This design is a **narrow experiment**, not a production identity architecture.

## Threat: arbitrary actor IDs

The earlier disposable `evidence_internal.record_review(actorId, request, grant)` accepted a caller-supplied actor ID. It checked record-level grants, but a trusted-server or SQL connection compromise could misattribute a reviewer if the gateway forwarded an unverified identity. No source review decision may be trusted from that route.

## Tested alternative: native login binding

`ops/prototypes/source-evidence/internal-review-bound-identity.sql` adds a separate wrapper:

- `record_review_bound(request, grantId)` accepts **no actor ID**. It maps PostgreSQL `SESSION_USER` to a reviewer through a protected, immutable `reviewer_principals` relation.
- Fixture reviewers use distinct native PostgreSQL LOGIN roles and passwords, not `SET ROLE` on a shared untrusted connection; their schema privileges are limited to the two bound RPCs.
- An append-only `grant_events` journal records `granted` and `revoked` transitions. The bound function locks the exact package record before evaluating the current grant state and before invoking the existing guarded transactional event writer.
- `revoke_bound_grant` is callable by the privileged disposable fixture only, and uses the **same package lock**, so a decision racing a revocation is serialized.
- `read_review_bound` rechecks the journal and existing package/case/rights gate before protected readback.
- All existing source-interpretation, medical/rights/exam/publication boundaries remain unchanged. Events are internal audit records, not source or clinical approval.

`scripts/internal-source-review-bound-identity-check.js` tests real PostgreSQL native sessions, wrong password, secondary reviewer denial, raw-table/direct-unbound-function denial, forged request actor fields, concurrent exact-request idempotency, decision-then-revocation lock ordering, immutable transition history and revocation-gated readback.

## Deliberately NOT solved

Native per-reviewer database logins are **not** how MLOS should authenticate its real Admin users. The intended Cloudflare/identity-provider request gateway still needs verified token signature and issuer/audience, server-controlled identity mapping, account/session revocation, qualified independent reviewer grant evidence, transaction/session lifecycle under pooled connections, audit logging, least privilege, rate limiting and explicit host deployment controls. **Do not deploy this SQL, grant reviewer logins in a hosted cluster, or expose the old unbound API.**

The prototype still relies on privileged initial issuance of the existing mutable `grants` fixture row and append-only `grant_events` extension. Its journal does not itself establish legally/clinically qualified reviewers or immutable source-rights policy. Native concurrency on #355 and this fixture do not prove a managed backup/restore or a secure real-world service.

**Next implementation gate:** isolated authenticated request adapter with verifiable real identity-provider claims and protected current-session state; replace the current mutable grant fixture with governed, immutable issuance/revocation under a separately audited authorization service; perform native race/restore and least-privilege security assessment. Only then plan controlled live Admin UI integration under explicit migration/deploy approval.

**No external provider, outbound evidence delivery or signing-key trust is needed for owner-approved Option A.** PR #350 stays deferred and draft.
