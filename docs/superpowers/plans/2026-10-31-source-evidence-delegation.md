# Offline owner delegation implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Prove verified-token-to-narrow-gateway delegation and postcommit receipt delivery offline.
**Architecture:** Test-only private closure with trusted verifier and fixed prepared SQL on gateway capability; capture inputs before awaits, repeat verifier after commit and validate exact canonical readback.
**Tech Stack:** Node24 built-ins, existing pure evidence contracts, disposable PGlite0.5.13.
**Spec:** docs/superpowers/specs/2026-10-31-source-evidence-delegation-design.md

## Global constraints
No route/runtime product/migration/credential/provider Auth changes. Existing trusted gateway/verifier can impersonate identities; no cryptographic verification claim. Canonical bytes restricted as existing SQL prototype. No dependencies or source descriptions. Keep feature default off.

## Review focus
Forged actor/session or verified flags; async input mutation; concurrent token cross-talk; commit/readback uncertainty; corrupt receipt/canonical payload and error leaks.

### Task1: Delegation closure
Files: scripts/lib/source-evidence-owner-delegation.js; tests/source-evidence-owner-delegation.test.js.
Interface: createSourceEvidenceOwnerDelegation({verifyUser,query}) -> stage({accessToken,candidate}), readback({accessToken,target}). verifyUser(token) -> {id} or null; query fixed SQL -> pg-compatible rows.
- [x] Write tests for accepted/available exact dispatch, absent/forged identity and malformed session/sub rejection, token unchanged to verifier, no caller authority fields, mutation while verifying, concurrent separate identities, postcommit verification denial, sanitized unknown failures.
- [x] Observe positive tests fail with rejecting placeholder.
- [x] Implement closure with strict capture and existing digest/request/receipt validation, only gated prepared SQL.
- [x] Run focused tests GREEN and checkpoint.

### Task2: Actual SQL proof and evidence
Files: scripts/source-evidence-delegation-db-check.js; CI evidence-native-postgres step; prototype README/proposal; handoff/status.
- [x] Write disposable real gateway-role stage/readback/retry tests, postcommit revoked session and lost-delivery reconciliation, byte/receipt corruption rejection and opaque error checks.
- [x] Run local PGlite proof; full npm test/check/diff; read-only whole-increment review and regression fix if needed.
- [x] Checkpoint to existing draft feature branch; inspect exact CI native/core results, record tested commit and unresolved production trust/provider Auth gates.

Ruling: existing repeated Next/direct execution authorization applies to this bounded prototype; no new design approval/production write is inferred. Execute inline; one final read-only reviewer.

## Execution evidence

Rejecting placeholder observed RED on positive/status paths; initial6focused tests GREEN, then8with concurrent identity and target snapshot coverage. Local SQL integration passes default-off, exact stage/readback/retry, foreign/unverified denial, corrupt canonical bytes, lost-delivery and unavailable-readback reconciliation, postcommit session denial/fresh same-owner session. npm test1,633PASS/0FAIL; npm run checkPASS13services/252locations. Final read-only review found no blocker; suggested unavailable-readback case added and passes. Native/core checkpoint CI pending.

Implementation50884283d891d97593d63b85b0d784f8a4c794b7: Foundation run41179228740/native job124473017762 SUCCESS. Exact9source/config readbacks match. SQL delegation integration, existing native login/platform races, omitted-lock controls, snapshot and WAL recovery all pass. Final evidence documentation is separate; core/browser/WebKit still running when native inspected. Trusted query autocommit completion is an explicit connector requirement, not inferred from SQL status.
