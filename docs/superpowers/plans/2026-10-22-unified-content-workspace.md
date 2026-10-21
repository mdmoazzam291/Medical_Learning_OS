# Unified Content Workspace Implementation Plan

**Goal:** Build the accepted Library content homes, shared dossier and admin preview within the existing application.
**Architecture:** Provider-independent projections feed reusable renderers and the existing authenticated controllers. Canonical published data and exact version identities remain authoritative.
**Tech stack:** Existing ES modules, CSS, Node tests and browser CI; no dependencies added.
**Spec:** docs/superpowers/specs/2026-10-22-unified-content-workspace.md
**Execution:** Inline in the feature checkout under the owner's build instruction. Keep production publication outside the checkpoint scope.

## Constraints and review focus
Preserve exclusive PYQ homes, publication gates, opaque themes, server scoring and private overlay ownership. Test unavailable/stale concept IDs, partial old API responses, aliases/long labels, draft leakage, large neighborhoods, route filter leakage and unsaved review interactions.

## Task 1 — Shared content context and projections
- [ ] Add failing tests in tests/content-workspace.test.js for validated transitions, alias discovery, dossiers and bounded exact-evidence neighborhoods.
- [ ] Implement src/domain/content-workspace.js. Extend library-workspaces routes with overview and graph perspective, shared context transitions and alias search. Extend projectLibrary with safe source references only.
- [ ] Run focused domain/projection tests; expect no failures.

## Task 2 — Workspace rendering and controller
- [ ] Add failing markup and route tests for four tabs, groups, selected concept, graph list equivalent and empty states.
- [ ] Create web/content-workspace-view.js and web/content-workspace.css. Integrate the shell with library.js while retaining specialized library-enhancements tools.
- [ ] Keep actual selection/filter/session behavior and Back restoration; wire context/explorer dialogs, load-more and accessible focus.
- [ ] Extend public surface allowlist and default Library navigation to overview.
- [ ] Verify focused tests and static build.

## Task 3 — Placement inspection and isolated draft preview
- [ ] Test metadata eligibility, unresolved external links, duplicate source homes and prompt-only preview.
- [ ] Create src/domain/content-placement.js and web/content-placement-view.js; integrate with authenticated content-import.js.
- [ ] Reuse workspace renderer in a draft-only dialog with responsive width controls. Never mark preview interactions as approval or learner evidence.
- [ ] Run domain/admin tests and verify existing review workflow behavior.

## Task 4 — Acceptance, review and checkpoint
- [ ] Add responsive synthetic browser acceptance and CI steps, including WebKit. Preserve no real-content publication.
- [ ] Run npm test, npm run check, build:pages and available affected browser checks; record exact limitations/failures.
- [ ] Review diff for API leakage, URL/state loss, accessibility, source status and old client compatibility.
- [ ] Update STATUS/DECISIONS/AI_HANDOFF, persist focused feature branch and create reviewable PR. Verify remote head/checks; do not claim deployed behavior.
