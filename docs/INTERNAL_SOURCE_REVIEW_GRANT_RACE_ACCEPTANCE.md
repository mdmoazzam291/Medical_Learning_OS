# Internal Admin source review — live-JWT grant-revocation transaction races

**1 November 2026 — disposable test-only design; no hosted migration or route.** ADR-134 internal source review. Stacked on #361. External delivery #350 remains deferred; private gateway OFF.

## Question tested

A signed, current GoTrue session and qualified case-specific grant may both be valid *at the start* of a reviewer request. What happens if a separate authority revokes that exact grant while the review is trying to commit? Testing a mock flag or revoking *after* a request is insufficient to prove transaction ordering.

## Implemented in this draft

The existing local GoTrue/PostgREST acceptance runs again using two independent signed-in users, exact case metadata, and a second PostgreSQL connection controlled by a **synthetic fixture revoker**. Only temporary SQL under `ops/prototypes/source-evidence/`, the local integration test and the PR-scoped CI predicate change.

The fixture now acquires locks in the deterministic order **actual Auth session → exact package → exact case grant** before checking the append-only grant journal and calling the immutable event writer. Revocation obtains **package → grant** before appending `revoked`. The reviewer must not first lock grant and then package, which would invert the base event writer's ordering.

Acceptance scenarios:

- **Decision first:** verified user B's JWT starts a source-review request and locks the package and grant. An independent revoker starts a package-row lock, visibly waits through `pg_blocking_pids`, then appends `revoked` only after the decision commits. The event remains immutable, but later protected readback and any new write with B's token are denied.
- **Revocation first:** qualified user A's *separate case-b* grant is revoked while the revoker holds a package and case-grant lock. A real signed-JWT HTTP request starts and is shown waiting on that transaction. When revocation commits, the request must be denied without a new event. The ledger remains at its prior count.
- Mutation/deletion of grant-event history must fail. All source-only, clinical, rights, exam-scope and learner-release flags remain false.

A fixture-only fixed-request sleep provides a stable observation window for one of the races; lock contention is **also observed from actual PostgreSQL backend PIDs**, rather than inferred from elapsed time. The test account and database are destroyed by local CLI teardown.

## Remaining trust and correctness limitations

- These are **disposable native/PostgREST/GoTrue test transactions**. The revoker is a synthetic privileged database connection, not a separately verified real-world review-grant issuer. Grant qualification, consent, independence and source rights are fixture booleans; no human source review has occurred.
- Real hosted Auth may not support or authorize locking its internal session table; no managed project access, Auth ACL, user token, MFA or privileged credential is tested. A direct database user able to forge JWT settings remains a critical denied-by-architecture threat.
- A reviewer grant should be issued and revoked by an independently authenticated, audited authority; this fixture's table models a single grant and append-only transition, not the full enterprise authorization lifecycle.
- The database receipt must still be reconciled to the canonical source-row review contract, then independently protected/verified after network loss. Native recovery/restore, issuer/claims policy, production-role configuration, live review API and Admin queue all remain pending.
- The existing `pg_sleep` test trigger and public-schema test RPC expressly **prohibit deploying this SQL unchanged**.

## Release gate

Keep all source-review PRs DRAFT/unmerged until an independently reviewed managed Auth/session permission plan is accepted. The next practical step is a least-privileged read-only **nonproduction hosted** Auth/role capability assessment or an officially supported current-session revocation method, followed by SQL audit and recovery tests. No production deployment or content publication is authorized by this test.
