# Owner evidence platform/session boundary plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Concrete owner-only adapter proposal plus executable disposable compatibility checks using existing runtime/Admin SQL functions.
**Architecture:** Test-only session-gated SQL wrappers, synthetic Auth tables and actual unmodified repository gate function definitions. Feature defaults off; no hosted route.
**Tech Stack:** Existing PGlite0.5.13 test tooling, SQL/JS canonical evidence contracts.
**Spec:** docs/SOURCE_EVIDENCE_SESSION_COMPATIBILITY.md; docs/SOURCE_EVIDENCE_DATABASE_DESIGN.md.

## Global constraints
No production migration/API/session/grant/rights changes. Auth tables contain only synthetic IDs. SQL session checks are not access-token signature/expiry verification; upstream getUser remains required. No claim that production Auth writers share prototype lock.

## Review focus
Missing/wrong-user sessions; suspension/deletion; Admin != package owner; revoked old session vs valid new session retry; feature default off and browser denial.

### Task 1
- [ ] Write positive wrapper behavior tests with rejecting SQL placeholder and observe RED.
- [ ] Add test-only platform_guard/stage_session/readback_session wrappers and feature gate.
- [ ] Test actual repository runtime/Admin definitions against synthetic Auth/session changes, owner transfer, policy/withdrawal and postcommit deny.
- [ ] Write exact owner-only HTTP/RPC proposal and remaining acceptance gates.
- [ ] Run disposable script, full tests/check, read-only review; add isolated CI verification; checkpoint PR346.

Review note: service_role raw probe/table privileges intentionally remain for existing disposable checks. Wrapper-only default-off is not a global backend boundary. Added explicit proposal/README release limitation; no hosted privilege plan or API readiness claim.
