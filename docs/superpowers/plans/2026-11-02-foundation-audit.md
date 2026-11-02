# Foundation continuation audit and learner identity delivery checks

> Use superpowers:executing-plans inline, test-driven-development and one final read-only review.

Scope: latest379ce627f5, read-only374/375/376 scope/CI reconciliation. Existing user authorizes engineering fixes, not human rights/medical decisions or production release. Staging mapping/runtime migrations already exist; no accounts or codes are created by this offline work.

- [ ] Execute actual learner identity handler under isolated trusted provider/DB fakes. Test anonymous/forged/origin/body/query/session outage, self-only valid read/ensure, corrupt cross-user readback, sanitized ambiguous writes and revocation during I/O.
- [ ] Observe revocation delivery regression RED; add fresh runtime check before delivering either GET/ensure result, retaining committed mapping on denial. This reduces exposure and is not atomic DB authorization or real hosted Auth proof.
- [ ] Add independently connected native PostgreSQL uniqueness/idempotency/collision/lost-response/rollback acceptance where feasible; retain disposable service-only ACL/cascade proof.
- [ ] Run full test/check and local SQL; final review; fix concrete issues RED/GREEN, checkpoint379 with expected-head lease and current handoff/status. Reconcile latest exact CI across374/375/376/379. No blanket merge/deploy/reviewer approval inferred.

Review focus: callbacks vs authentic hosted evidence; response leaks after revocation; constraints vs reported stored code; retries on uncertain writes; stale checkpoint/CI claims. No new service or dependency intended.
