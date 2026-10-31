# Native PostgreSQL concurrency and recovery plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Verify actual independent PostgreSQL connections and advisory-lock ordering for retry/conflict/withdrawal/authority/policy races, plus native recovery parity.
**Architecture:** Fresh private Unix-socket-only server with existing unprivileged OS identity, three independent clients, pg_locks barriers, fixed synthetic SQL schema and canonical JS envelopes. No hosted connection.
**Tech Stack:** Scratch-pinned @embedded-postgres/linux-x6418.6.0-beta.19 (PostgreSQL18.6 binaries), pg8.22.0; no app dependency.
**Spec:** docs/SOURCE_EVIDENCE_DATABASE_DESIGN.md and prototype acceptance docs.

## Global constraints
Never accept a database URL. TCP disabled; private temporary cluster/socket; close clients/stop server/remove temp cluster in finally. Existing root process may launch children as existing nobody uid65534, never create OS users or change workspace permissions.

## Review focus
Missing lock falsely passing overlap tests; stale state after lock wait; rollback orphan writes; accepting receipt before actual commit; cleanup leaks. Real pg_locks observations, known negative control and final cleanup checks cover these.

### Task 1: Native fixture and deterministic races
- [ ] Build disposable server helper and independent-client check script.
- [ ] Observe barrier failure with in-memory SQL mutation omitting advisory locks; run checked-in SQL and verify blocked independent clients and actual commit order.
- [ ] Test identical/conflicting requests, withdrawal first, stage first, authority/policy first and rollback releasing a waiter.

### Task 2: Native recovery and final verification
- [ ] Export native database, restore into a fresh native database using existing audited helper, compare exact digest/receipt and preserve withdrawals/ACL.
- [ ] Run prior probes plus npm test/check, fresh read-only review and cleanup confirmation.
- [ ] Update README/handoff/status and persist PR346 feature checkpoint, with hosted Auth/production/current-platform gaps explicit.

Execution ruling: local namespace maps only UID0; nobody chown fails EINVAL and user namespace creation is denied. Do not bypass PostgreSQL's root refusal. Run native check on existing GitHub Actions non-root Ubuntu runner via isolated test-only job. Local syntax/full-suite checks remain useful but cannot certify native races.
