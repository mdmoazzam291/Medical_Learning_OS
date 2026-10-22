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
- [ ] Write failing behavioral tests for registry/profile validation, union/closure, exact bindings, gaps and question identity deduplication.
- [ ] Implement src/domain/preparation-pathways.js and data/preparation-curriculum.js.
- [ ] Run focused tests, inspect failures, then full suite baseline.

### Task 2: Synced account preference and scoped Library
- [ ] Add failing Auth adapter tests for read/write validation, network failure and metadata isolation.
- [ ] Implement preparation methods in existing Auth adapter; Account selector and retry status.
- [ ] Attach trusted curriculum/profile in content-library-api; scope shared Library route/filter/renderers and expose per-exam inventory.
- [ ] Test old API fallback, empty profile, URL transitions and no answer-bearing data exposure.

### Task 3: Study Now and acceptance
- [ ] Test shared domain selection with new/revision questions and exact-version boundaries.
- [ ] Integrate goal scope before new Study Now plans, preserving existing session resume.
- [ ] Add responsive synthetic browser acceptance for selector, goals/foundations/all and persistence.
- [ ] Run npm test, npm run check, build and browser checks; review complete diff.
- [ ] Update ADR/STATUS/handoff and save focused feature-branch commits plus PR, verify remote head.

## Execution ledger
- Inspection complete: current main and open PRs checked. New branch owns only combined preparation work. Owner's direct request authorizes inline implementation of the supplied design; no additional approval loop introduced.
