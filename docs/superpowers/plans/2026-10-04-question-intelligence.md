# Question Intelligence Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline for this owner-authorized task.

**Goal:** integrate orthogonal metadata, safe derivatives and representation-aware evidence into the existing learning loop.
**Architecture:** extend the v1 import validator and publication transaction; store metadata on the existing question metadata table and prompt snapshots on sessions. Keep the original catalog and event v1 intact.
**Tech Stack:** JavaScript, existing Supabase PostgreSQL/Edge Functions, vanilla browser UI.
**Spec:** docs/superpowers/specs/2026-10-04-question-intelligence.md

## Global Constraints
No erased content reuse, invented PYQ occurrences, fabricated human approval, extra recurring service, or adaptive-mastery activation. Forward migrations only. Original SBA/key/options stay immutable. Existing source-rights and human publication gates apply.

## Review Focus
- Stale source versions must suppress derivatives.
- Concise evidence must not increase full-question scheduling evidence.
- Failed/missing critical checks must block publication/use.
- Option order/IDs and answer leakage must remain protected.
- Empty clinical inventory must remain empty after verification.

### Task 1: Metadata and derivative contracts
Files: src/domain/question-intelligence.js, src/domain/content-library.js, tests/question-intelligence.test.js.
Interfaces: validateIntelligence(question, metadata), learnerIntelligence(question, metadata), taskAxes(question).
- [x] Write behavior tests for valid v2, stale variants, protected fact loss, missing checks, changed options/key and safe projection.
- [x] Run node --test tests/question-intelligence.test.js; expect failing assertions.
- [x] Implement validators/crosswalk, v2 optional fields and learner projections/filters.
- [x] Run targeted tests; expect all pass.

### Task 2: Reviewed persistence and study delivery
Files: new Supabase migration, content-library handler, study-api, web/library.js, web/medical.js, API/browser tests.
Interfaces: v2 validator/publication wrappers; study_start_library_session_v2; session question_presentations; attempt presentation.
- [x] Add failing API tests for concise selection/rejected unknown variants.
- [x] Add SQL validation/rehearsal tests for exact version binding and original-only scheduling.
- [x] Implement transactional wrappers, server-owned prompt snapshots, derivative labels and filters.
- [x] Run API/domain/browser tests on phone/tablet/desktop, and isolated database rehearsal; expect no live content or learner writes.

### Task 3: Pilot and outcome measurement
Files: docs/QUESTION_SHORTENING_PILOT.md, src/domain/shortening-evaluation.js, scripts/evaluate-shortening.js, tests/shortening-evaluation.test.js, docs/STATUS.md, docs/DECISIONS.md.
Interfaces: evaluateShortening(protocol, records) -> descriptive report with explicit exclusions and null empty rates.
- [x] Write failing tests for no evidence, delayed/full cases, contamination and unequal study time.
- [x] Implement reproducible measurement and pilot selection/preregistration.
- [x] Run npm test, npm run check, npm run build:pages and responsive browser checks.
- [x] Save pilot protocol/status to Drive; verify backend deployment and distinguish missing clinical inputs from shipped functionality.
- [ ] Push reviewed frontend branch and run GitHub CI/production build — explicit destination/publication approval received; release checks pending.
