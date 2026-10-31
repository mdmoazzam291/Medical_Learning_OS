# Narrow gateway capability and platform mutation ordering plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove raw probe/table access from a dedicated fixture gateway and test Auth/session mutation ordering against that capability.
**Architecture:** Private definer bridge owned by a non-login, non-bypass executor with explicit RLS/ACL grants; no gateway membership/escalation. Fixture-only Auth/Admin/feature mutation triggers share evidence lock.
**Tech Stack:** Existing PGlite0.5.13 and pinned native PostgreSQL18.6/pg8.22.0 tooling.
**Spec:** docs/SOURCE_EVIDENCE_OWNER_ADAPTER_PROPOSAL.md privilege limitation.

## Global constraints
No production migration/credentials/API or actual Auth trigger installed. Existing general service_role remains broad for unrelated probes. New capability does not verify access-token signatures; trusted server getUser remains mandatory. Coarse global Auth trigger protocol is test-only and must not be transplanted to production.

## Review focus
Gateway raw access/role escalation; definer owner privileges/search_path; disabled feature bypass; real session writer lock ordering; production credential routing gap.

### Task 1
- [ ] Write narrow-role fixture tests and observe invoker-only placeholder cannot stage.
- [ ] Implement explicit private bridge/role/RLS policy overlay with feature default off.
- [ ] Test wrapper access, raw table/helper/governor denial, role escalation, source/owner/session/feature conditions.

### Task 2
- [ ] Add fixture platform mutation lock triggers and native independent login-role races.
- [ ] Test revoker-first, stage-first, account suspension and feature/Admin changes using real pg_locks barriers; no manual lock in mutation statements.
- [ ] Verify previous checks and CI, record exact evidence and unresolved hosted-role/auth-provider constraints.
