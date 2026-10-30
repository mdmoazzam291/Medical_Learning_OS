# Disposable SQL validation and authority history plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reject malformed receipt/domain shapes and preserve package owner and append-only authority/policy history in the disposable prototype.
**Architecture:** SQL allowlists and typed validation before writes; immutable package row; shared-lock authority writers/current latest-history reads. Existing JS canonical digest derivation remains required.
**Tech Stack:** Existing SQL/PLpgSQL and PGlite0.5.13 scratch tooling.
**Spec:** docs/SOURCE_EVIDENCE_DATABASE_DESIGN.md; ops/prototypes/source-evidence/README.md.

## Global constraints
No migration/API/hosted connection/dependency changes. No claim of independent SQL JCS/case/manifest/request re-derivation, production Auth or multi-connection concurrency acceptance.

## Review focus
Receipt extra/missing/null fields; invalid UTC timestamp/UUID; case locator/interpretation shape; package owner alias; latest deny versus historical allow and immutable history. Tests cover these before code.

### Task 1
Files: ops/prototypes/source-evidence/schema.sql, scripts/source-evidence-db-check.js, ops/prototypes/source-evidence/README.md.
- [x] Add malformed receipt/domain assertions and observe rejection gap RED.
- [x] Implement SQL exact-key/type/shape validation, immutable package binding and append-only authority/policy writers under same lock.
- [x] Replace destructive fixture updates with governed append calls; assert immutable history, latest-deny behavior, backend/browser writer denial and rollback.
- [x] Run disposable SQL script, npm test, npm run check, read-only review; checkpoint handoff/status/PR.

Execution record: rehashed extra-key receipt assertion RED before SQL validation then GREEN. History writer missing-function RED then GREEN. Disposable script PASS with date boundaries, malformed package/case/receipt shapes, immutable package/history, latest deny/explicit new allow and backend writer denial. Read-only review found no concrete SQL blocker; stale README corrected. Digest derivation/JCS SQL parity remains explicit next work.
