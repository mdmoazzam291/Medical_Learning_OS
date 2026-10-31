# Source evidence staging request implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Offline exact staging request/fingerprint preparation and receipt integrity matching.
**Architecture:** Reuse canonical-integrity and source-row-evidence; no persistence or authority.
**Tech Stack:** Existing JavaScript ESM, Node test runner, SHA-256.
**Spec:** docs/SOURCE_EVIDENCE_STAGING_PORT.md

## Global constraints
No new provider/dependency, source text, storage, API or grants. Input snapshot before asynchronous work. Exact ordinary shapes. Maximum canonical candidate UTF-8 16 MiB and existing 10,000 cases; transport must enforce its own pre-parse limit.

## Review focus
Caller mutation; self-consistent forged receipts; metadata changes under same request; malformed property descriptors; missing receipt fields. Tests cover each, while documentation explicitly excludes origin authentication.

### Task 1: Offline contracts
Files: src/domain/source-evidence-staging.js, tests/source-evidence-staging.test.js, docs/SOURCE_EVIDENCE_STAGING_CONTRACT.md.
Interfaces: prepareSourceEvidenceStagingRequest(candidate, actorId, options) returns frozen request binding {requestId,actorId,packageId,packageVersion,packageDigest,requestFingerprint}; matchesSourceEvidenceStagingReceipt(receipt,binding,options) returns Promise<boolean>.
- [x] Write tests: canonical SHA oracle, order stability, request/actor/claim changes, mismatch/schema rejection, synchronous snapshot, receipt digest and all binding/approval fields.
- [x] Run rejecting placeholders; expect positive paths to fail.
- [x] Implement using canonical-integrity and existing package validator; no trusted staging outcome.
- [x] Run focused test, npm test and npm run check; expect all pass.
- [x] Fresh read-only review, update handoff/status and checkpoint on existing draft PR #346.

Execution record: rejecting placeholder failed positive paths; hidden-array and receipt-getter regressions separately observed RED then GREEN. Eight focused test groups pass. Reviewer found these two paths fixed and no further concrete defect. No transaction implementation in this slice.
