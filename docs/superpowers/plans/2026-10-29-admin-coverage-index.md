# Admin Coverage Index — Slice 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an authenticated Admin inventory workspace that exposes empty concepts and honest question/content gaps without changing learner publication.

**Architecture:** A service-only PostgreSQL function captures a bounded metadata projection in one statement and stores a five-minute, actor-bound derived snapshot. A pure domain projection computes counts/filters/pages over that frozen snapshot; a protected owner API returns only metadata. The isolated Admin workspace uses the existing owner client and navigation.

**Tech Stack:** Node 24 ES modules, existing HTML/CSS/JS, PostgreSQL SQL/RPC, existing owner Edge Function; no new application dependency.

**Spec:** ../specs/2026-10-29-coverage-index-design.md (owner approved in chat 29 October 2026).

## Global Constraints
- Slice 1 only; no material imports, clinical decisions, learner visibility or production changes.
- Baseline remains incomplete; no completeness percentage or claimed approved coverage.
- Preserve canonical IDs, source appearances, exact version link roles and existing preparation registry.
- All 19 subjects are available; question-only filters never hide zero-match concepts.
- No stems, answers, bodies, source documents, learner records or credentials in coverage responses.
- Keep current learner delivery unchanged until a separate publication cutover is authorized and tested.

## Review Focus
- A new draft moves a primary link while the current published version remains on its original concept.
- A PYQ/year filter has no matches: concepts still appear with zero counts.
- Invalid/foreign/expired snapshots fail rather than regenerating silently or exposing data.
- Network/auth failure or a slower previous request cannot overwrite the latest scope or show stale counts as current.
- Shared questions across concepts/subjects and repeat appearances do not inflate canonical totals.

### Task 1: Pure inventory projection
**Files:** Create `src/domain/content-coverage.js`, `tests/content-coverage.test.js`.
**Interfaces:** `coveragePage(snapshot, filters)` returns `{contractId,snapshotId,asOf,expiresAt,catalogVersion,registryVersion,baseline,summary,facets,rows,nextCursor}`. Snapshot contains sanitized `concepts`, `questions`, `notes`, `candidates` and exact metadata versions. `parseCoverageFilters(URLSearchParams)` validates filters and bounds page sizes/cursors.
- [ ] Write failing behavioral tests for empty concepts, independent version-state links, repeated PYQ deduplication, role separation, gap-after-count filtering, unclassified and empty scopes, shared-identity totals, malformed filters and response redaction.
- [ ] Run `node --test tests/content-coverage.test.js`; observe missing feature, then implement and rerun to green.
- [ ] Keep approved eligibility/verified PYQs unknown; label stored lifecycle separately from actual approval.

### Task 2: Coherent private snapshots and owner route
**Files:** Create migration via Supabase CLI; create `supabase/functions/owner-api/_shared/content-coverage.js`, `tests/content-coverage-api.test.js`, `scripts/content-coverage-db-check.js`; modify `supabase/functions/owner-api/index.ts`.
**Interfaces:** `owner_content_coverage_snapshot_v1(p_actor uuid,p_snapshot_id uuid default null)` returns actor-bound metadata snapshot; TTL five minutes and no public/browser RPC access. `readContentCoverage({admin,actor,params,registryVersion})` validates request before RPC and returns Task 1 page; errors carry HTTP status/code. Caller retains existing Auth/runtime/Admin gates.
- [ ] Write API/SQL tests first: no unknown parameters/forged actor, permission denial, single metadata snapshot, exact pagination replay after content changes, foreign/expired denial and no raw bodies/keys.
- [ ] Observe failures, then implement the migration/helper/route. SQL limits refuse incomplete oversized inventory; no partial zero-success response.
- [ ] Run Node API tests and `PGLITE_MODULE_URL=... node scripts/content-coverage-db-check.js` to green.

### Task 3: Admin UI and navigation
**Files:** Create `web/content-coverage-view.js`, `web/content-coverage.js`, `web/content-coverage.css`, `tests/content-coverage-view.test.js`, `scripts/content-coverage-browser-check.js`; modify owner client, owner console, Admin view registry, app navigation, public asset allowlist and CI.
**Interfaces:** `coverageMarkup(page,selection)` renders escaped metadata; `mountCoverage({root,loadPage,window})` owns URL filter/page state and request generation guards. `cloudOwner.contentCoverage(filters)` calls the protected read route. No public/protected data fallback.
- [ ] Test rendering and transport before implementing: zero rows vs errors, empty concept under PYQ filter, escaping, exact query encoding and no actor parameter.
- [ ] Implement labeled concept/question filters, current-inventory/baseline warning, all-19-subject navigation, separate draft/stored-published counts, pagination, metadata detail and links to existing Intake/Review.
- [ ] Run actual built assets in Chromium and WebKit phone/tablet/desktop scenarios: load/filter/reload/back, no horizontal page overflow, latest-response wins, retry/expiry/access denial and no publication writes. Add this script to existing CI jobs.

### Task 4: Verification and saved handoff
**Files:** Modify service register/coupling only for justified existing-provider paths; update `docs/STATUS.md`, `docs/AI_HANDOFF.md`, `docs/DECISIONS.md` and implementation evidence.
- [ ] Run `npm test`, `npm run check`, `npm run build:pages`, SQL harness, responsive browser checks and `git diff --check`.
- [ ] Fresh whole-branch review, then important fixes with failing regressions and a green suite. Preserve unrun/failed checks explicitly.
- [ ] Save feature branch and draft PR; verify remote tree/head. No merge, migration application, function deployment or content publication in this execution.

## Self-review
This implements slice 1 only. Checklist authoring/standalone notes and approved release integration remain slices 2/3. Derived snapshot storage is not another canonical registry. Stored verified/published counts are explicitly not fresh clinical clearance. Artifact-only filters retain rows. API and UI use one snapshot per session and never silently replace expired pages. User explicitly requested implementation; execute inline without another plan-approval pause.
