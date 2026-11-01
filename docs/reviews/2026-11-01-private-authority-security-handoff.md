# Private authority and signed receipt safety — isolated reviewer handoff

**Status: DRAFT, disposable/offline prototype ONLY.** Scope: [PR #350](https://github.com/mdmoazzam291/Medical_Learning_OS/pull/350), stacked on canonical source-evidence foundation [#349](https://github.com/mdmoazzam291/Medical_Learning_OS/pull/349). Private provider integration is **not** approved or connected. Gateway default OFF.

## What the tests establish

- Synthetic narrow database roles, ephemeral provider/Auth fixtures, limited private SQL calls, subject authorization epochs/leases, one-shot delivery **intent** and conditional signed **acknowledgement**; no automatic redrive after ambiguous results.
- Disposable PostgreSQL 17 and 18 tests cover row-lock ordering, revocation-before-acknowledgement denial, acknowledgement-before-revocation commit ordering, uncommitted intent/rotation rollback on immediate shutdown, retired-key history and role/ACL denial.
- A generic Ed25519 verifier, pinned synthetic key-fingerprint/epoch registry and bounded read-only-by-contract HTTPS lookup **prototype** exist. Local fixtures cannot prove that a real provider owns the signing key or that its receipt means actual recipient delivery.
- The guarded SQL acknowledgement checks signer epoch inside the database transaction. Network identity, external signer ownership, hosted Auth freshness and source/clinical/rights decisions remain **separate** and unsatisfied.
- Local GoTrue/Auth, TLS/SCRAM, pg_dump/restore and runtime controls are **test evidence only**, not permission to mutate hosted Auth tables, provision secrets or deploy an API.

Read `docs/evidence/2026-10-31-private-delivery-intent-reconciliation.md`, `docs/SOURCE_EVIDENCE_GATEWAY_DEPLOYMENT_GATES.md` and `docs/evidence/2026-10-31-disposable-private-tls-restore-security.md` for scope boundaries and failure modes.

## Hard blockers and review order

1. Independent business/product approval that **external receipt delivery is genuinely required**; do not overbuild an unnecessary provider.
2. If approved, independently establish provider identity, **out-of-band key provenance**, documented signed durable receipt semantics, isolated read-only credentials, egress/TLS ownership, rotation/revocation and recipient verification. See [issue #347](https://github.com/mdmoazzam291/Medical_Learning_OS/issues/347).
3. Verify supported hosted Auth session revocation semantics and restricted production role/credential path; never install fixture permissions or triggers onto provider-managed Auth relations.
4. Confirm signed receipt cannot bypass source copyright rights, qualified clinical review, curriculum adjudication or manual Admin publication gates.
5. Require full exact-head CI, independent security review, a tested rollout/rollback runbook and explicit production approval before any merge/deployment.

The first split core run [41244906624](https://github.com/mdmoazzam291/Medical_Learning_OS/actions/runs/41244906624) passed **1,698 tests, zero failures**, and native PG17/18 succeeded; GoTrue and browser/WebKit had not all completed. This security branch's GoTrue CI predicate was subsequently expanded **only to its own PR #350**. This documentation commit needs new exact-head validation.

Original #346 and the combined historical `docs/AI_HANDOFF.md` / `docs/STATUS.md` remain preserved; they are **not** included in this PR. Separate shared-log audit: [issue #351](https://github.com/mdmoazzam291/Medical_Learning_OS/issues/351).

**Decision:** Do not merge, provision credentials, call external delivery successful, publish content or activate the gateway.
