# Canonical Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan inline. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Deliver exclusive question homes, connected Notes/Graph views and repository/admin intake with one authorized review/publication action.

**Architecture:** Existing catalog/notes remain canonical. New metadata and immutable import receipts extend them; one SQL transaction owns publication. Authenticated API and browser views consume the same versioned contract.

**Tech Stack:** Node 24, dependency-free JavaScript, Supabase Postgres/Edge Functions, GitHub Actions, isolated Playwright 1.56.1.

**Spec:** `docs/superpowers/specs/2026-10-04-canonical-library-design.md`

## Global Constraints
- PYQ home overrides all platform homes; non-PYQ priority marrow > prepladder > dams, then alphabetical unranked IDs.
- Published prompts never disclose answer keys; user declarations become provenance only after admin review.
- Existing catalog, notes, scoring, scheduler and historical learner evidence remain authoritative.
- No private-import implementation or content deletion.
- No new product dependency, credentials in browser/git, or recurring service.

## Review Focus
- Reordered options with changed IDs must match, but a conflicting correct answer must fail.
- Repeated upload IDs with changed contents and stale review digests must reject.
- A second reviewer request cannot partially publish or duplicate immutable receipts.
- Unpublished metadata and notes must not leak through learner graph filters.
- Lower-priority platform and repeated-year occurrences must retain provenance without duplicate cards.

## Task 1: Contract and pure library rules
Files: contract/spec/README/AGENTS/ROADMAP, `src/domain/content-library.js`, `tests/content-library.test.js`.
Interfaces: `validateImport(manifest)`, `questionSignature(question)`, `questionHome(origins)`, `projectLibrary(input)`, `filterLibrary(library, filters)`.
- [x] Write behavioral tests for exclusive homes, repeated years, option-order matching, conflicting answers, unknown categories, unpublished hiding and exact/secondary/distractor concept links.
- [x] Run `node --test tests/content-library.test.js`; expected RED missing implementation.
- [x] Implement the strict manifest validator and pure projections.
- [x] Run the same tests; expected GREEN; commit.

## Task 2: Persistent intake and atomic review
Files: CLI-generated migration, `supabase/functions/content-library-api/index.ts`, `_shared` domain/runtime access, API tests and rollback verification SQL.
Interfaces: stage RPC `(manifest, submitter)` -> immutable digest; publish RPC `(importId, reviewer, expectedDigest, rightsDecisions, reviewNotes, attested)` -> receipt; GET learner library and admin inbox.
- [x] Write actual-handler denial/body/rights/digest tests and rollback SQL with hand-derived duplicate/publication counts.
- [x] Run against missing routes/functions; expected RED.
- [x] Add RLS-denied metadata/import tables and service-only RPCs; no new learner-scoped tables. Implement actual authenticated handler.
- [x] Verify rollback-only concurrency/idempotency/catalog/receipt boundaries; expected GREEN; commit.

## Task 3: App views and repository transport
Files: browser library/import HTML/JS/CSS, public surface, navigation links, inbox validator/stager, inbox workflow, responsive browser checks and CI step.
Interfaces: API contracts from Task 2; pure projections from Task 1; inbox manifest from contract.
- [x] Write real browser tests for both views, exclusive source filters, related questions, no answer leakage, admin one-action submission, outages and no writes on navigation.
- [x] Run browser suite; expected RED absent flow.
- [x] Implement views, canonical links, draft inbox and pipeline; private import stays absent.
- [x] Run browser suite at 390/820/1440px and existing affected suites; expected GREEN; commit.

## Task 4: Verify and release
- [ ] Run `npm test`, `npm run check`, `npm run build:pages`, `git diff --check`; expected all pass.
- [ ] Perform independent whole-branch review and fix Important/Critical findings with RED/GREEN tests.
- [ ] Apply additive migration/deploy API, verify advisors and live origin/auth boundaries without creating learner/clinical evidence.
- [ ] Publish focused PR, wait for Foundation CI, release and verify served-byte parity.
- [ ] Update STATUS/DECISIONS with actual evidence and limits. Never mark private import, content reset or genuine medical review complete.
