# Status

Current state and recent entries. Entries up to 2026-11-17 are archived in [archive/STATUS-through-2026-11-17.md](archive/STATUS-through-2026-11-17.md) (unchanged). Add new entries at the top of "Recent".

## Current state — 2026-11-17
- NMC foundation source accounting complete: registry @24, 2,865 draft objectives on 1,544 concepts, 2,633/2,634 NMC rows linked (PS9.2 deleted officially). No clinical or faculty review (owner skipped it); no learner activation; no question import.
- Concepts: 1,543 accepted private identities; subject revisions supported and applied to 328 concepts.
- Syllabus checklist functions read current identities (migration `20261117150000`).

## Recent

### 2026-11-17 — Deploys, open-PR inventory, product principles
- Deployed owner-api v25 (registry @25, overlay-checked validation) and nmc-admin-preview v26 (@25 Admin learner preview). PR #468 merged after all four checks passed.
- `docs/PR_INVENTORY-2026-11-17.md`: 76 open PRs grouped; owner approved closing 75 (PARSE rebrand dropped). `tests/account-oauth-redirect.test.js` restored from #229 as a regression guard.
- `docs/PRODUCT_PRINCIPLES.md`: durable design rules (exam yield ≠ forgetting, competence vs session state, no early RL/bandits, measure transfer, no learning-style labels).

### 2026-11-17 — Registry @25: learning metadata; full Admin learner preview
- `src/domain/nmc-learning-metadata.js` + `ops/nmc/apply-learning-metadata.js` (deterministic, AI-authored rules; evidence `docs/evidence/2026-11-17-nmc-learning-metadata-v1.json` lists every change). Objective IDs and wording unchanged.
- Task: the 1,875 objectives tagged `mechanism` re-tagged to the question-intelligence vocabulary by the earliest-mentioned focus (747 remain mechanism; e.g. etiology 158, differential 155, interpretation 160, treatment-selection 75). New `taskFacets` lists every task an objective names (1,613 one, 833 two or more).
- Context: population `children` (256, Paediatrics rows) and `women` (146, OG rows); jurisdiction `india` for Forensic and Community Medicine (317); others `not-specified`.
- New `assessability`: in-app 2,012; in-app-partial 799 (shows-how or procedural); offline-only 54 (performs). Validator requires both fields from @25.
- Admin learner preview rebuilt from the registry: all 2,865 objectives with task and assessability; a subject or search is required before listing; banner states AI-drafted, not faculty-reviewed.

### 2026-11-17 — Overlay-checked registry validation; history archived
- `validateFoundationDrafts` and `foundationDraftPage` now require the reference overlay; each exception binding must match its overlay row (search alias or topic group for resolved codes/headings, official replacement for amendment rows); deleted rows never bind. Negative tests cover a missing overlay, a missing row, a wrong kind, a forged basis, a deleted row and a standard row claiming an exception basis. owner-api loads the overlay as a seventh pinned data file (pin commit `bbccf9c`); owner-api is not yet redeployed — the deployed v24 still serves the CI-validated @24 data and will be redeployed with registry @25.
- PS 2.1* overlay note corrected: printed form kept; PS2.1 is a search-only alias; asterisk meaning unresolved.
- STATUS.md and AI_HANDOFF.md history moved unchanged to `docs/archive/`; both files now hold current state only. PROJECT_CONTEXT.md reconciliation date updated.
