# Disposable SQL staging conformance plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Execute the existing reusable staging transaction scenarios against disposable committed SQL records.
**Architecture:** Test-only SQL driver, real SQL stage/readback functions, authoritative table inspection; deterministic client delivery/readback faults. No hosted connection or production adapter.
**Tech Stack:** Existing PGlite0.5.13 scratch tooling, SQL prototype, JS canonical/binding helpers and reusable conformance harness.
**Spec:** docs/SOURCE_EVIDENCE_DATABASE_DESIGN.md; docs/SOURCE_EVIDENCE_STAGING_CONFORMANCE.md.

## Global constraints
Fresh isolated in-memory database per scenario; close on success/failure. No app dependency, production migration/API/grant or source bytes. Single embedded connection/driver queue is not multi-connection concurrency validation.

## Review focus
Receipt accepted before readback; unexpected commit outcome; mirror state replacing actual records; swallowed validation failure; deny writer ordering. Scenarios/negative driver controls exercise these.

### Task 1
Files: scripts/lib/source-evidence-sql-driver.js, scripts/source-evidence-sql-conformance.js, ops/prototypes/source-evidence/README.md.
- [x] Observe positive harness failure against rejecting driver.
- [x] Implement driver stage/readback/digest verification, SQL-record inspection and deterministic transaction/delivery faults.
- [x] Run all ten existing scenarios plus broken-driver rejection controls and previous SQL probe; run npm test/check.
- [x] Fresh read-only review, reconcile limitations/handoff/status, checkpoint draft PR #346.

Execution record: rejecting driver failed positive retry assertion RED. All10 SQL scenarios and3 deliberately broken wrappers passed/rejected as intended. Reviewer-found early-close race and author-added concurrent-close regression observed RED, fixed by tracking full preparation/SQL/readback and sharing close completion. No multi-connection, hosted Auth or crash durability claim.
