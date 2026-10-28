# Admin Concept Drafts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let Admin create a concept without questions or propose edits to an existing concept, preserving versioned drafts and canonical identities.
**Architecture:** Immutable proposal revisions in the existing database, service-only RPCs behind existing owner Auth/runtime/Admin gates, and a separate editor inside Coverage Index. Drafts never modify the accepted catalog or learner projections.
**Tech Stack:** Existing Node24 ES modules, PostgreSQL, HTML/CSS/JS and owner API. No new provider/SDK.
**Spec:** ../specs/2026-10-29-coverage-index-design.md, slice2 additions/edits/review. This is the first authoring increment, not complete slice2 or approval/release.

## Global Constraints
- No production deployment, clinical/source approval, canonical writes, learner changes, approval or Publish action.
- Stable IDs, immutable revisions, server actor/time, idempotent retries and optimistic predecessor/canonical digest checks.
- Existing imports, old IDs and review contracts remain compatible. Baseline remains incomplete.
- Forms retain input on failures and navigation; save is confirmed by readback. Browser roles cannot call underlying SQL or read draft tables.

## Review Focus
- Same retry after a timeout returns the original revision; changed payload under the same request ID fails.
- Two editors on the same predecessor: one save succeeds, one conflicts without overwriting history.
- Canonical label/classification changes after loading: draft save conflicts instead of silently adopting a different base.
- Failed save/readback preserves typed fields and the retry identity; successful save binds to the returned exact revision.
- New draft concepts remain separate from canonical inventory and cannot establish syllabus coverage or medical approval.

### Task 1: Domain, persistence and API
Files: create src/domain/concept-drafts.js, tests/concept-drafts.test.js, SQL migration via CLI, scripts/concept-drafts-db-check.js, supabase/functions/owner-api/_shared/concept-drafts.js and tests/concept-drafts-api.test.js; extend owner-api/index.ts.
Interfaces: validateConceptDraft(input) validates schemaVersion/requestId/proposalId/expectedDigest/conceptId/baseDigest/document; document contains label/aliases/classification/sourceEvidence/changeReason. concept_draft_save_v1(p_actor,p_input) returns immutable receipt. concept_draft_inspect_v1(p_actor,p_proposal_id) returns draft summaries and canonical target metadata, or one exact latest draft/history. No actor/status/reviewer accepted from browser.
- [ ] Write tests, observe missing feature failure, implement validation and API request/route validation.
- [ ] SQL tests first: new zero-question concept, edit existing target, revision/history, same/conflicting retry, stale predecessor/base, unauthorized access, immutability and unchanged canonical catalog.
- [ ] Implement SQL with request/proposal advisory transaction locks, full request fingerprint, canonical target digest and service-only access; run Node and disposable PostgreSQL checks to green.

### Task 2: Editor and browser acceptance
Files: create web/concept-draft-editor.js, tests/concept-draft-editor.test.js, scripts/concept-drafts-browser-check.js; extend owner client, coverage boot/panel/CSS and public allowlist/CI.
Interfaces: mountConceptDraftEditor({root,inspect,save,window}) uses existing owner methods; draft list is paginated, canonical picker bounded, per-proposal detail includes history and near-name candidates. Save/readback state is separate from inventory filters.
- [ ] Write failing transport/render tests and actual browser scenarios before implementation.
- [ ] Add explicit new/existing concept target selection, name/aliases/subject/system/organ/domain/task fields, provenance/change reason, draft history and save-only controls.
- [ ] Preserve dirty input on failures, disabled controls while saving, stale response guards, request ID on retry and unsaved-changes confirmation before deliberate target replacement/unload. No optimistic Saved badge before readback.
- [ ] Run Node tests and phone/tablet/desktop browser checks including failed save, retry, conflict, edit/history, escaping and no canonical publish writes. Keep existing inventory flow passing.

### Task 3: Save and review
- [ ] Update portability/service records for new existing-provider paths; run full npm test/check/build, SQL and Chromium. Check prior PR332 native CI.
- [ ] Fresh whole-branch review; important fixes get failing regressions and green suites.
- [ ] Save on feat/admin-concept-drafts-20261029 stacked on PR332; update handoff/status/receipt, verify remote tree/head and CI. No merge, live migration or publication.

## Self-review
This delivers concept proposal authoring only. Review acceptance, standalone-note authoring, baseline/objective activation and final release stay later increments of the accepted design. Same database, canonical identities and learner delivery are preserved. User's Next continues authorized work; execute inline without another design/plan permission pause.
