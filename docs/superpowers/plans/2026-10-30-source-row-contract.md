# Source-row contract implementation plan

> Execute inline using executing-plans; no cloud release.

**Goal:** implement strict offline request validation and receipt matching.
**Architecture:** pure JavaScript in one domain module; no imports, network, database or authorization side effects.
**Spec:** docs/NMC_EXACT_ROW_REVIEW_WORKFLOW.md.

## Constraints and review focus

Exact allowlisted fields; four source-only dispositions; no clinical, rights, exam or learner authority.
UUID request/package/server IDs; lowercase SHA256 strings; versions1-1000000; case slug1-128; rationale24-4000characters.
Reject stale bindings, actor spoofing, extra fields, accessors/inherited records and impossible dates.
Receipt match is not proof of trusted origin,signature,authorization or true source verification.

## Task

- [x] Add tests for valid clone/dispositions, all missing/extra keys, invalid values, accessor/prototype rejection and exact receipt binding.
- [x] Run tests against rejecting placeholder: two positive behaviors fail.
- [x] Implement validateSourceRowReviewRequest and matchesSourceRowReviewReceipt in src/domain/source-row-review.js.
- [x] Run focused tests, npm test, npm run check; inspect failures and diff.
- [x] Record verification/limits in handoff; checkpoint the focused feature-branch changes.
