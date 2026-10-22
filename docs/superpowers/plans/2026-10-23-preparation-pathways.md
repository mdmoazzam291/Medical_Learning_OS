# Preparation Pathways Implementation Plan

> Execute inline under the owner's direct implementation request; use superpowers:executing-plans and test-driven-development.

**Goal:** Add synced NEET-PG/INI-CET/Both preparation over the existing canonical workspace.
**Architecture:** A pure validated curriculum registry resolves goal scope and inventory coverage. Account metadata stores only a learner preference; authenticated Library and Study Now use the same domain resolver.
**Tech Stack:** Existing dependency-free JavaScript, TypeScript Edge APIs, Auth, Node tests and responsive HTML.
**Spec:** docs/superpowers/specs/2026-10-23-preparation-pathways-design.md

## Global constraints
No duplicated catalog, fabricated clinical requirements, changed publication authority, new dependency/service, migration, simulator changes or production release. Preserve all learner evidence and open runs. Only two active goal identities initially.

## Review focus
- Unmapped objectives must not look complete or become unrelated recommendations.
- Historical PYQs from another exam may be suitable only through reviewed mappings.
- Exact content revisions must suppress outdated bindings.
- Changing goals must not discard an open session or historical evidence.
- An older API or failed preference request must not invent a saved goal.

### Task 1: Curriculum and preparation domain
- [x] Write failing behavioral tests for registry/profile validation, union/closure, exact bindings, gaps and question identity deduplication.
- [x] Implement src/domain/preparation-pathways.js and data/preparation-curriculum.js.
- [x] Run focused tests, inspect failures, then full suite baseline.

### Task 2: Synced account preference and scoped Library
- [x] Add failing Auth adapter tests for read/write validation, network failure and metadata isolation.
- [x] Implement preparation methods in existing Auth adapter; Account selector and retry status.
- [x] Attach trusted curriculum/profile in content-library-api; scope shared Library route/filter/renderers and expose per-exam inventory.
- [x] Test old API fallback, empty profile, URL transitions and no answer-bearing data exposure.

### Task 3: Study Now and acceptance
- [x] Test shared domain selection with new/revision questions and exact-version boundaries.
- [x] Integrate goal scope before new Study Now plans, preserving existing session resume.
- [x] Add responsive synthetic browser acceptance for selector, goals/foundations/all and persistence.
- [ ] Run npm test, npm run check, build and browser checks; review complete diff.
- [ ] Update ADR/STATUS/handoff and save focused feature-branch commits plus PR, verify remote head.

## Execution ledger
- Inspection complete: current main and open PRs checked. New branch owns only combined preparation work. Owner's direct request authorizes inline implementation of the supplied design; no additional approval loop introduced.

- Review: three Important scope defects reproduced and fixed; focused15workspace tests pass. Later account lifecycle review reproduced late projection/account authority contamination; generation and identity guards added with two RED→GREEN VM regressions. Metadata order confirmation regression also RED→GREEN.
- First hosted run39844047399: core failed on one unreviewed synthetic-session marker; explicitly reviewed and added scripts/preparation-browser-check.js → existing auth provider to coupling baseline (13services/226locations). Chromium reached the new preparation test and failed a selector expecting a standalone note title; actual dossier renders title in its provenance line. Selector corrected to the exact displayed provenance line. Neither failure is hidden as a pass. WebKit was still queued at inspection.
- Fresh full suite after lifecycle changes and final check/build required before completion. No release performed.

- Final runtime0bddf286b8bebdbf6aa38ac31a859602374af796:1411Node tests, check13services/226locations and108-file build pass. Independent review clean. Hosted core and fullWebKit pass; feature-specific Chromium tests pass. Chromium broad job was cancelled at15minutes after a9minute dependency installation; only that job is retried. Keep final verification checkbox open until its result is recorded.
