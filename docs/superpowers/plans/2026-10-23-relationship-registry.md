# Relationship registry implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Supply the existing Medical graph through an authoritative versioned registry and human review interface.
**Architecture:** Immutable assertion rows plus append-only lifecycle events, service-only RPCs in the existing database/API, Admin controls in Import & review. Existing domain projection remains the public allowlist.
**Tech Stack:** PostgreSQL, PGlite, JavaScript Node tests, vanilla browser UI, Playwright.
**Spec:** docs/superpowers/specs/2026-10-23-relationship-registry-design.md

## Global constraints

No clinical seed, human attestations by agents, new grants, production migration/deploy, copied private learner content or separate provider. Current version/rights/grants checked at publication and read. All browser input is untrusted; actor derives from Auth.

## Review focus

- Stale inspections and concurrent corrections must not overwrite latest work.
- Revoked or expired rights/review authority must hide previously published edges.
- Failed publication must leave no partial receipt or catalog mutation.
- Raw draft/actor/review notes must never reach learner responses.
- Abandoned edits, repeat clicks and failed requests must preserve reviewer intent.

### Task 1: Immutable SQL authority and trusted snapshot

Files: create `supabase/migrations/*_medical_relationship_registry.sql`, `scripts/medical-relationship-db-check.js`; modify CI, portability baseline/register and projection documentation.
Interfaces: `medical_relationship_stage_v1(jsonb,uuid)` → staged version/digest; `medical_relationship_inspect_v1(uuid,text default null)` → Admin queue/exact packet; `medical_relationship_publish_v1(text,uuid,text,text,boolean)` → receipt; `medical_relationship_retire_v1(text,uuid,text,text)` → receipt; `medical_relationship_feed_v1()` → safe latest-state envelopes; preserve `content_library_snapshot_v1(uuid)`.

- [x] Write disposable PostgreSQL assertions for staging, review, rights, correction, feed, immutability, role isolation, exact retries and rollback; run to show the missing migration fails.
- [x] Implement immutable tables, exact-target hashes, service-only functions and snapshot composition. Use existing canonical publication lock and genuine reviewer/source-rights helpers.
- [x] Run PGlite and existing Data API/privacy checks; expected pass. Inspect coupling additions individually and register only the new reviewed paths.
- [x] Checkpoint engineering and handoff to owned branch.

### Task 2: Authenticated routes

Files: modify existing `supabase/functions/content-library-api/_shared/handler.js`; create `tests/medical-relationship-api.test.js`.
Interfaces: GET/POST `/relationships`, GET `/relationships/:versionId`, POST `/relationships/:versionId/publish` with `{digest,reviewNotes,attested}` and `/retire` with `{digest,reason}`. Stage accepts `{assertion}`. Exact fields, bounded request, Auth-derived actor. Expected conflicts return409, insufficient authority403, unknown500 sanitized.

- [x] Write tests for ordinary learner, origin/session, extra fields, injected reviewer/flags, exact RPC args, stale digest and unavailable RPC; run RED.
- [x] Implement routes using the Task1 RPC names; all relationship routes require Admin first.
- [x] Run focused Node tests and full suite; expected pass. Checkpoint.

### Task 3: Human inspection and browser acceptance

Files: create `web/medical-relationship-admin.js`, `scripts/medical-relationship-browser-check.js`; modify `web/content-import.html`, `scripts/build-pages.js` if allowlist requires, CI and relevant docs.
Interfaces: own section/form/status on existing Import & review; use existing content-library request/escape adapter. Structured assertion input with previous-version/digest for corrections; inspected server packet shown before human attestation or retirement. Capabilities from server, no assumed reviewer authority.

- [x] Write browser journey with synthetic service responses for stage/inspect/approve, stale conflicts, retirement and dirty edits across phone/tablet/desktop; run RED in hosted browser when local engines unavailable.
- [x] Implement escaped packet, exact digest-bound actions, dirty/busy/stale-selection protection and truthful empty state.
- [ ] Run npm test/check/build, SQL suites and hosted Chromium/WebKit; expected all green.
- [ ] Fresh whole-branch review under requesting-code-review, fix material findings with failing regressions, update plan/handoff/STATUS, preserve branch/PR checkpoint. Do not claim live registry deployment or clinical acceptance.
