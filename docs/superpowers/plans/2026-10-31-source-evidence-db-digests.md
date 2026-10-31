# Disposable evidence SQL digest derivation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Independently derive evidence digests in the SQL prototype for the existing restricted metadata domain and compare against JavaScript.
**Architecture:** Restricted ASCII/integer canonical serialization, exact SQL-derived manifest and request fingerprint, canonical-byte verification at stage/readback. No general Unicode/floating-point JCS claim.
**Tech Stack:** Existing PLpgSQL, SHA256, PGlite0.5.13 scratch tooling, JS digest oracle.
**Spec:** docs/SOURCE_EVIDENCE_DATABASE_DESIGN.md and SOURCE_ROW_EVIDENCE_DIGESTS.md.

## Global constraints
No production migration/API/new app dependency. Existing strict domain schemas before hashing. General JSON JCS outside the supported domain must reject. No source-byte verification or authority origin claimed.

## Review focus
Self-consistent forged manifest/case refs; changed claims with old digest; changed request fingerprint; noncanonical bytes; array case ordering. Tests cover all.

### Task 1
Files: ops/prototypes/source-evidence/digests.sql, schema.sql, README.md; scripts/source-evidence-db-check.js.
- [x] Add direct forged-claim SQL rejection test and observe acceptance RED.
- [x] Implement restricted canonical serializer and SQL digest derivation, enforce canonical supplied bytes and request/manifest parity.
- [x] Revalidate stored readback, normalize stored case ordering without changing exact retry receipt.
- [x] Add JS oracle/boundary/mutation tests; run disposable script, full npm test/check and read-only review.
- [x] Update handoff/status and persist draft PR #346, preserving prototype limitations.

Execution record: forged well-shaped claim accepted before SQL digest derivation (RED), rejected after (GREEN). Author-found case projection mismatch and reviewer-found stored receipt/physical binding gaps reproduced with negative assertions and fixed in shared validation/readback. Disposable SQL script PASS, including 12 JS oracle packages and unsupported-domain rejection. General JCS/Auth/concurrency/restore remain outside prototype claims.
