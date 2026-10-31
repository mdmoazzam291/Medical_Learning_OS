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
- [x] Write narrow-role fixture tests and observe invoker-only placeholder cannot stage.
- [x] Implement explicit private bridge/role/RLS policy overlay with feature default off.
- [x] Test wrapper access, raw table/helper/governor denial, role escalation, source/owner/session/feature conditions.

### Task 2
- [x] Add fixture platform mutation lock triggers and native independent login-role races.
- [x] Test revoker-first, stage-first, account suspension and feature/Admin changes using real pg_locks barriers; no manual lock in mutation statements.
- [x] Verify previous checks and CI, record exact evidence and unresolved hosted-role/auth-provider constraints.

## Evidence

Implementation acbec7548b0a1f0dcc807d567d0a946ff4a25e5e: Foundation run41174062255 native job124457846742 SUCCESS. Five platform ordering scenarios, actual gateway login denial, omit-trigger failure+cleanup, prior seven native races/snapshot and WAL recovery pass. Local PGlite capability/platform checks pass; deliberately postgres-owned bridge rejected by catalog test. npm test1,625PASS; npm run check13services/252locationsPASS; diff whitespacePASS. Read-only reviewer findings (catalog assertions, idle-client error handling) addressed. Browser/WebKit and core CI still running when native evidence recorded; no whole-run completion claimed.
