# Exact source evidence resolution implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Resolve one exact case/source from an immutable metadata snapshot without latest-version fallback.
**Architecture:** Expose existing synchronous strict package capture, reuse package SHA computation, return scalar-only frozen bindings.
**Tech Stack:** Existing JavaScript/Node tests, canonical-integrity.
**Spec:** docs/SOURCE_EVIDENCE_STAGING_PORT.md (exact-package and source resolution section).

## Global constraints
No storage, auth, rights, source bytes, SDK or production wiring. Resolve requires every package/case version and digest; source comes from selected case. Capture before asynchronous work.

## Review focus
Mixed sources; wrong version or digest; mutation during hash; malformed original array descriptors; sibling case changes. Tests exercise each.

### Task 1
Files: src/domain/source-row-evidence.js (extract/export captureSourceRowPackage), src/domain/source-evidence-resolution.js, tests/source-evidence-resolution.test.js, docs/SOURCE_EVIDENCE_RESOLUTION.md.
Interfaces: captureSourceRowPackage(value) returns detached validated sorted package snapshot; resolveSourceEvidenceCase(packageCandidate,selection,options) returns Promise<frozen scalar metadata binding> or rejects. selection exact {packageId,packageVersion,packageDigest,caseId,caseVersion,caseDigest,appearanceEvidenceDigest}.
- [x] Write failing tests using rejecting placeholders: mixed-source selected case, each missing/mismatched binding, corrupted sibling, snapshots, malformed descriptors, immutable result and no-byte authority.
- [x] Extract existing synchronous package capture without changing digest semantics; implement resolver using that snapshot and existing digests.
- [x] Run focused tests, full npm test, npm run check and fresh read-only review.
- [x] Document limitations, update handoff/status and checkpoint draft PR #346.

Execution record: rejecting placeholder failed positive resolver paths. Final focused14PASS (six new resolver groups plus eight existing digest groups), full npm test1,621PASS/0FAIL and npm run checkPASS (13 services/250 coupling locations). Read-only review found no concrete defect. No authority/storage integration claimed.
