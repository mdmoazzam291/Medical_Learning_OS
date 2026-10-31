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
- [x] Test writer-first and evidence-first for session/account/Admin/feature, actual row blocking, rollback/retry, and mixed-order deadlock atomicity/reconciliation. No Auth mutation triggers.
- [x] Native --key-share negative control fails the required barrier and cleans the fixture.
- [x] Run local test/check/diff; final read-only review; checkpoint existing draft feature branch and inspect exact native/core CI; record actual results/limits.

Ruling: repeated direct Next authorization covers bounded offline investigation, not production Auth changes. Execute inline with one final reviewer.

Ruling: local positive probe showed row locking also needs UPDATE-policy USING visibility. Add USING(true) WITH CHECK(false), with actual UPDATE rejection regressions; merely omitting UPDATE policies returns no lockable rows.

Local evidence: rejecting placeholder evidence_platform_denied RED; initial lock-only SELECT policy returns no lockable rows (UPDATE USING required), repaired with WITHCHECKfalse and actual-write denial checks; final PGlite0.5.13 positive/ACL/isolation/current-denial checks PASS. Full1,633Node testsPASS; npm run check13services/252locationsPASS; syntax/diffPASS. Native tests and weak-key-share control written, awaiting isolated CI (local UID0-only initdb limitation unchanged).


## Verified CI acceptance — 31 October 2026

- Tested implementation head: `8b2b2fe32cf587f7a3a29ffe0d157ea0f55840da` (draft PR #346; no production release).
- Exact-head GitHub Foundation run [41179764295](https://github.com/mdmoazzam291/Medical_Learning_OS/actions/runs/41179764295) completed `SUCCESS` with four jobs: `evidence-native-postgres` (`124474683422`), `check` (`124474683536`), `browser` (`124474683558`), and `webkit` (`124474683607`). These are workflow results for the implementation head, not necessarily any later documentation-only head.
- Native log independently confirms five writer-first and five evidence-first account/session/Admin/feature mutation scenarios with plain writers and no Auth triggers; row/transaction waiting; writer/evidence rollback, no orphan evidence, same-request retry; unrelated-account independence. Opposite lock order produced PostgreSQL `40P01` as expected; victim rollback and retry converged to one immutable receipt. This tests recovery from deadlock, **not** deadlock avoidance.
- The intentionally weakened `--key-share` run failed with `row_authority_barrier_not_observed` and `Authority row fixture cleanup PASS`; CI checked both strings. The expected negative-control exception is not an unexpected test failure. All four workflow jobs succeeded.
- Local implementation checks before the CI checkpoint were 1,633 Node tests passing, `npm run check` passing with 13 services / 252 reviewed coupling locations, plus SQL fixture ACL/RLS/write-denial checks and read-only review. CI core, Chromium and WebKit checks also passed at the tested head.
- **Scope remains disposable:** no actual Supabase Auth provider integration, source bytes, NMC rights clearance, real independent reviewer, dedicated hosted credential or HTTP handler. No production migrations, role changes, publications, exam-syllabus approval, or learner release. Provider session expiry/refresh/MFA/cleanup/cascades, live lock order, hard deletion, credential compromise and hosted restore remain unverified. PR #343 → #344 → #346 remains draft/stacked; do not merge or enable a learner pathway based solely on these tests.
