# Disposable withdrawal, postcommit denial and recovery plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete exact withdrawal, postcommit current denial and consistent export/restore preserving denied states.
**Architecture:** Immutable exact-revision withdrawal; shared-lock governance; deterministic SQL changes between commit/readback; trusted-digest-pinned full fixture snapshots and audited fresh-db restore.
**Tech Stack:** Existing SQL/JS/PGlite0.5.13 scratch tooling.
**Spec:** docs/SOURCE_EVIDENCE_DATABASE_DESIGN.md.

## Global constraints
Disposable synthetic data only. No migration/API/hosted/dependency/source-byte changes. Deterministic single-connection schedules are not real concurrent races. Snapshot checksums are not authentication; independently retain expected digest.

## Review focus
Wrong withdrawal target; retry revival; receipt leaked after postcommit denial; restore seeding allows; omitted history or partial import.

### Task 1: Withdrawal and postcommit denial
- [x] Write failing acceptance tests in scripts/source-evidence-recovery-check.js.
- [x] Implement exact immutable withdrawal and guards in prototype schema, SQL driver controls and deterministic postcommit governance faults.
- [x] Assert history retained, retry/read denied, separate version unaffected.

### Task 2: Consistent recovery
- [x] Observe missing snapshot behavior.
- [x] Add scripts/lib/source-evidence-sql-snapshot.js with locked repeatable-read export, pinned-digest validation, transactional fresh-target restore, identity continuation and integrity audit without changing denied states.
- [x] Test allowed/revoked/policy-denied/withdrawn restores, corrupt/omitted data, browser isolation and postrestore writes.

### Task 3: Verification
- [x] Run new recovery check, prior SQL conformance/probe, npm test/check and read-only review.
- [x] Reconcile README/handoff/status and checkpoint draft PR #346.

Execution record: missing withdrawal behavior and snapshot placeholder observed failing, then acceptance checks GREEN. Reviewer reproduced orphan null-bound audit event restore; rejection regression observed RED, event constraints/every-event audit fixed GREEN. Expanded recovery script exercises all four restore states, wrong targets, postcommit current denial, pinned digest/corrupt/omitted history, internal integrity, rollback/nonempty target and sequence continuation. Prior conformance/probe and full suite/check results recorded in handoff. No hosted or true multi-connection acceptance claimed.
