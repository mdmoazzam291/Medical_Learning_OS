# Graph PR303 integration plan

> **For agentic workers:** Use superpowers:executing-plans for this existing, owner-authorized integration. Implementation stays inline; obtain one fresh whole-branch review before completion.

**Goal:** Integrate PR303 with released preparation and Account behavior without weakening reviewed medical evidence or learner scope.

**Architecture:** Reuse the reviewed relationship projection and existing preparation scope. Merge current main into the original PR history, retain both documentation histories, and repair only reproduced integration behavior.

**Tech Stack:** Existing JavaScript domain modules, Node tests and Chromium/WebKit browser acceptance; no new dependencies or services.

**Spec:** docs/MEDICAL_RELATIONSHIP_PROJECTION.md and docs/PREPARATION_PATHWAYS.md.

## Global constraints

- Clinical edges are never inferred from educational co-links.
- Only approved requirements and bindings qualify material.
- Coverage remains independent per exam and does not imply mastery.
- No source publication, clinical approval, research enrollment or learner write.
- Preserve current preparation, Account and exact-source API behavior.

## Review focus

- Goal/foundation filters must not retain relationships to excluded concepts.
- Retained relationships must keep their exact source metadata available.
- Invalid or unmapped preparation must remain empty; Explore all must retain published context.
- Missing, revoked or retired evidence must remain unavailable after scope changes/reload.
- API/static packaging must include every imported domain module.

### Task 1: Merge and verify the integration

**Files:** Resolve docs/AI_HANDOFF.md, docs/STATUS.md and docs/UNIFIED_CONTENT_WORKSPACE.md; inspect src/domain/preparation-pathways.js, src/domain/content-library.js and web/content-workspace-view.js; extend tests/medical-preparation-integration.test.js and scripts/content-workspace-browser-check.js only for reproduced behavior.

**Interfaces:** projectLibrary(snapshot) produces already-reviewed medicalRelationships; preparationLibrary(library, scope) restricts the shared published inventory; conceptNeighborhood(scopedLibrary, conceptId, options) renders only known endpoints.

- [x] Record baseline and reproduce merge conflicts; keep the newer main receipts and original graph history.
- [x] Write executable scope/source regressions against real projections and watch the reproduced failures before the minimal fix.
- [x] Retain relationships only when both endpoints survive preparation scope; keep their referenced source rows; clear them in empty scope.
- [ ] Run focused regressions, npm test, npm run check, npm run build:pages and five-width workspace/preparation browser checks; inspect screenshots.
- [ ] Obtain fresh independent review and resolve material findings with failing-first regression evidence.
- [ ] Save to the original PR303 branch using a non-forced update, verify remote source, then inspect exact-head hosted checks before integration/release claims.

## Execution record

- Main base:26b9c0f48b7f70a36a38afe714794cf36f9d72f9; original PR303 head:96a8010923ad98fcbcdb74456283c188ef6c6923.
- Ruling: this resumes the existing approved graph and preparation design; no new design approval is needed for merge/conflict repairs. Source/clinical publication authority remains unchanged.
- Initial full test command reported1399 passes, but its source read overlapped the exploratory merge; do not treat it as an isolated baseline. Final combined source receives a fresh full suite.
- Independent review found one Important raw-renderer scope bypass. Two regressions failed before applying scope at conceptNeighborhood; all35 focused tests then passed. No Critical or Minor findings. Existing #299 storage/authority, actual clinical validity, live production acceptance and hosted browser acceptance remain separate gates; no additional review authority is implied.
