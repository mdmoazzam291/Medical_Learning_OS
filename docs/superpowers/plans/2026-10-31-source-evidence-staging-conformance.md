# Staging transaction conformance implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reusable synthetic transaction acceptance scenarios for a future staging adapter.
**Architecture:** Test-only driver protocol, independent invariant assertions and fault injection. An in-memory model plus deliberately broken variants prove harness sensitivity; no production adapter.
**Tech Stack:** Existing Node test/assert, canonical SHA and staging request contracts.
**Spec:** docs/SOURCE_EVIDENCE_STAGING_PORT.md

## Global constraints
Synthetic citation metadata only. No service, SDK, database, API, rights or grant changes. Harness success is not durable-storage acceptance.

## Review focus
Duplicate retry receipt; changed request/revision overwrite; partial transaction visibility; committed-but-unacknowledged retry; readback tampering and stale authority. Explicit scenarios exercise each.

### Task 1: Harness and executable model
Files: tests/helpers/source-evidence-staging-conformance.js, tests/helpers/source-evidence-staging-model.js, tests/source-evidence-staging-conformance.test.js, docs/SOURCE_EVIDENCE_STAGING_CONFORMANCE.md.
Interfaces: runStagingScenario(name, createDriver) async; createDriver gives isolated {stageMetadata,inspect,inject,deny,close}. stage returns {status,receipt?}; inspect is privileged test-only authoritative state. Fault points before-commit, after-commit, readback-unavailable, readback-tampered.
- [x] Write scenario tests against rejecting model and observe positive-path failures.
- [x] Implement atomic copy/commit memory model, serialized requests and readback; inject deterministic failures.
- [x] Add broken-model controls requiring harness rejection for retry duplication, partial writes, uncertain acceptance, tampered acceptance and authorization bypass.
- [x] Run focused tests, npm test, npm run check and fresh read-only review.
- [x] Document coverage limits and update handoff/status; checkpoint draft PR #346.

Execution record: rejecting model failed ten positive scenarios. Reviewer demonstrated missing persisted-claim verification; corruption regression failed before verifyStored was added and passed afterward. Focused sixteen tests pass, including six broken-driver controls. No persistence implementation or live transaction acceptance claimed.
