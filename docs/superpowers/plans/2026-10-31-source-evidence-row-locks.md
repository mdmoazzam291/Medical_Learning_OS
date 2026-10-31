# Disposable authority row-lock implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Prove plain authority mutation ordering without global Auth triggers.
**Architecture:** Lock-only private definer under isolated non-login role, explicit minimal column/RLS grants, existing narrow entry points and unchanged runtime checks. Lock rows before metadata advisory lock.
**Tech Stack:** Existing Node24/PGlite0.5.13/native PostgreSQL18.6 tooling; no dependencies.
**Spec:** docs/superpowers/specs/2026-10-31-source-evidence-row-lock-design.md

## Global constraints
Disposable only; no Auth provider migration/trigger/credential/route. READ COMMITTED only; authority row order account→session→Admin→feature. FOR SHARE needed for non-key mutations. Keep false approval flags and feature default off.

## Review focus
Minimal SELECT/UPDATE column grant for locking; private ACL/owner/searchpath and RLS; blocked writer visible after wait; deadlock rollback/retry; unrelated row independence and unsupported isolation denial.

### Task1: Row-lock overlay and local ACL proof
Files: ops/prototypes/source-evidence/authority-row-locks.sql; scripts/source-evidence-row-lock-db-check.js.
- [x] Add rejecting placeholder/private row-lock fixture check and observe positive failure.
- [x] Implement lock-only role/function and platform_guard composition, explicit RLS/ACL.
- [x] Local positive/default-off/session/account/missing/isolation checks, gateway/executor/Auth update denial and locker catalog checks pass.

### Task2: Native plain-writer order and rollback
Files: scripts/source-evidence-row-lock-pg-concurrency.js; .github/workflows/ci.yml; prototype/deployment docs; handoff/status.
- [ ] Test writer-first and evidence-first for session/account/Admin/feature, actual row blocking, rollback/retry, and mixed-order deadlock atomicity/reconciliation. No Auth mutation triggers.
- [ ] Native --key-share negative control must fail required barrier and clean fixture.
- [ ] Run local test/check/diff; final read-only review; checkpoint existing draft feature branch and inspect exact native/core CI; record actual results/limits.

Ruling: repeated direct Next authorization covers bounded offline investigation, not production Auth changes. Execute inline with one final reviewer.

Ruling: local positive probe showed row locking also needs UPDATE-policy USING visibility. Add USING(true) WITH CHECK(false), with actual UPDATE rejection regressions; merely omitting UPDATE policies returns no lockable rows.

Local evidence: rejecting placeholder evidence_platform_denied RED; initial lock-only SELECT policy returns no lockable rows (UPDATE USING required), repaired with WITHCHECKfalse and actual-write denial checks; final PGlite0.5.13 positive/ACL/isolation/current-denial checks PASS. Full1,633Node testsPASS; npm run check13services/252locationsPASS; syntax/diffPASS. Native tests and weak-key-share control written, awaiting isolated CI (local UID0-only initdb limitation unchanged).
