# Learner code native crash recovery implementation plan

> **For agentic workers:** Use superpowers:executing-plans inline with one final fresh read-only review.

**Goal:** Observe exact learner mapping durability and retry behavior after actual disposable PostgreSQL crash recovery.
**Architecture:** New fixed-private native integration fixture uses the existing server helper, exact source migration and domain allocator. Add positive and skip-crash negative runs to native17.6/18.6 CI.
**Tech Stack:** Node24, existing pinned native PostgreSQL/pg packages; no dependency additions.
**Spec:** docs/superpowers/specs/2026-11-02-learner-code-crash-recovery-design.md

## Global constraints
No hosted URL, inherited PG credential target, real learner data, production/staging mutation, release or managed recovery claim. Reuse clean linked worktree at a77ac094; branch379 remains one writer. Local UID0-only namespace cannot initdb; real integration proof comes from CI. Parent evidence CI41424667990 verified SUCCESS.

## Review focus
Committed writes after checkpoint survive WAL replay; uncommitted write disappears without prior disconnect/rollback; stale clients cannot recover implicitly; retry does not rotate committed code; skipped restart cannot pass observation; error/cluster cleanup is bounded and explicit.

### Task 1: Fixture and CI proof
Files: create scripts/learner-code-native-crash.js; modify .github/workflows/ci.yml and reviewed portability register/baseline; add receipt and handoff/status.
Consumes: startDisposableNativePostgres({postgres}) -> config, crashAndRestart(), stop(); allocateLearnerCode({authUserId,storage,randomBytes}).
Produces: deterministic PASS markers and skip-crash negative requiring learner_crash_recovery_not_observed plus cleanup.
- [ ] Add native test assertions for interrupted/WAL recovery, persisted rows, lost-response reconciliation, rollback, fresh allocation and ACL/unique constraints. The fixture itself is the integration test; no production implementation change.
- [ ] Add --skip-crash negative; CI must prove intended observation failure and cleanup, then positive recovery on both versions. No claim of local native GREEN.
- [ ] Run local syntax/diff, full npm test and check. Inspect exact remote native logs; fix genuine failures; require final review and all5sourceCIjobs.
- [ ] Save scope/limits, tested source/run, checked time, next external gate and owner release to receipt/status/handoff with expected-SHA branch update and remote readback.
