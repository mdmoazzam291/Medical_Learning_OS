# Admin Workflow Stability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Admin pending work, blockers, drafts and failures dependable and keep experimental controls out of routine review.

**Architecture:** One additive service-only SECURITY INVOKER count RPC and GET Library endpoint, consumed independently of owner dashboard health. Shared small domain/view/draft helpers support current controllers; keep server authority, exact-version evidence and existing responsive navigation.

**Tech Stack:** Existing JavaScript/PLpgSQL, Node tests, pinned disposable PGlite and Chromium/native WebKit. No repository dependency, new table or persistent draft store.

**Spec:** docs/superpowers/specs/2026-10-24-admin-workflow-stability-design.md. Builder check: nothing important left. Owner authorized the prior concrete stability priorities and exclusion of unnecessary controls; execute inline.

## Global Constraints
- Only Medical_Learning_OS; preserve current Admin tablet/desktop top and phone avatar entry, five groups and learner isolation.
- No clinical/source publication, fabricated actor/attestation, data deletion, research activation or permission widening.
- Counts are complete snapshot totals; latest100 list pagination remains a disclosed separate task.
- Draft safety means leave/discard warnings and failed-write DOM preservation, not automatic persistence/recovery after confirmed departure.
- Server rechecks remain authoritative; unknown counts/grants are never treated as zero/approval.

## Review Focus
- Count old drafts outside100 records and only latest nonterminal relationship versions; never revive a retired correction.
- Independently unavailable/stale summary cannot hide owner tools, create an all-clear or overwrite a newer read.
- Edit/revert, programmatic file/correction JSON, disabled pending controls, cancelled internal filters and other dirty forms must behave safely.
- Authentication loss removes protected content even when drafts exist; no cross-account content cache.
- Advanced controls remain reachable and critical ordinary source/Medical/References/Rights review remains visible.

### Task1: Authoritative pending-work summary

**Files:** new CLI-created migration20261024102454_admin_workflow_summary.sql; new src/domain/admin-workflow.js; content-library-api/_shared/handler.js; src/domain/admin-action-inbox.js; web/owner-console.js; web/admin-workspace-view.js; new SQL check and existing API/inbox tests.

**Interfaces:** RPC admin_workflow_summary_v1(p_actor uuid) → {contractId:'admin-workflow-summary-v1',asOf,draftImportBatches,draftRelationshipAssertions}; GET /admin-workflow derives actor. readAdminWorkflowSummary(value) → validated object or null. buildAdminActionInbox(dashboard,{alerts,workflow}) accepts independent validated count evidence. Overview takes workflow as its third argument. Refresh never replaces mutation forms.

- [ ] Write RED SQL/API/domain tests:125draft imports, >100relationship identities, superseded/published/retired latest semantics, actual service execution, null/non-Admin/browser denial, strict method/query/actor envelope, no writes, malformed/failed evidence unknown.
- [ ] Implement minimal read-only RPC/route/validator and actual current reviewKinds on import inspection. Keep empty search_path and service-only ACL; no new data owner.
- [ ] Extend inbox/overview with separate batch/assertion units and timestamps; independently request/refresh summary with generation/main guards, fail unknown, preserve other owner data/forms.
- [ ] Run SQL/API/inbox/owner focused tests and full suite/check; manually review portability marker additions. Save code/handoff checkpoint remotely before external waits.

### Task2: Workflow clarity, errors and draft-safe mutations

**Files:** new web/admin-workflow-view.js and web/admin-draft-guard.js; web/content-library-client.js; content-import.js; medical-relationship-admin.js; review.js; owner-console.js; new helper/controller and browser regressions; public allowlist.

**Interfaces:** workflow view exposes import preflight/current-authority summary and escaped error markup with retained flag. Draft guard compares form values/defaults in memory, commit(form) marks successful staging clean, confirmDiscard({except}) protects replacements, beforeunload protects dirty or busy state. Mutation lock stores/restores previous disabled states without rendering form DOM.

- [ ] Write RED tests for exact server-grant absence/expiry, source evidence/attestation blockers, safe error codes/escaping and client preservation of server error code/status.
- [ ] Write RED real-behavior guards/controller cases: edited/reverted defaults, pending lock, file/correction JSON, cancelled filter restoring previous selection, failed writes retaining fields and other-form discard guard.
- [ ] Implement helpers and integrate existing controllers. Do not redraw legacy review fields during pending/failing writes. Guard only replacements that can lose work; keep same-document mounted Admin navigation unprompted. Authorization loss bypasses preservation and removes protected content.
- [ ] Run helper/controller/adjacent review tests and full Node/check/build; keep API publication/rights gates unchanged.

### Task3: Routine screen cleanup and verified release

**Files:** review.js and browser scripts; .github/workflows/ci.yml SQL verification; admin feature map and release/handoff/status docs.

**Interfaces:** Advanced review tools contains existing experiment/comparison/batch panels only; ordinary review/source evidence stays in the normal view. Existing registered destinations remain.

- [ ] Write RED browser assertions for hidden-by-default but accessible experimental controls, routine review visibility, complete/unknown inbox, blocked grants, safe stage/publish failure, draft cancel/refresh/back and pending locks on phone/iPad/desktop.
- [ ] Implement collapsed Advanced disclosure and ordinary labels, retaining its open choice in-page. Exclude new unnecessary modules, general role management, persistent draft caches and duplicate navigation.
- [ ] Run exact-head full Node/check/build/SQL and Chromium/native WebKit; inspect final screenshots and obtain fresh independent code review. Fix material findings with RED-to-GREEN evidence.
- [ ] Persist verified source, apply only committed reviewed RPC migration, deploy exact additive Library API with existing JWT/runtime checks, merge/release and inspect ledger/ACL/deployed files/guest denial and unchanged clinical data. Never invoke hosted publication to test.
- [ ] Complete release receipt and update feature map to distinguish implemented stability changes from later pagination/guided-editor/audit proposals; save final checkpoint and report genuine authenticated acceptance limits.

## Execution ledger

Baseline1460/1460 Node tests passed. Live preflight confirms service SELECT on existing imports/relationship tables and EXECUTE on Admin helper; security/performance findings captured before changes. Existing Library APIv7/verify_jwt=false has8files and verifies Auth/runtime access itself. Supabase docs confirmed SECURITY INVOKER/ACL rules; changelog markdown fetch was unsupported, with no new SDK/API convention introduced. Builder check: nothing important left.
