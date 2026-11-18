# Status

Current state and recent entries. Entries up to 2026-11-17 are archived in [archive/STATUS-through-2026-11-17.md](archive/STATUS-through-2026-11-17.md) (unchanged). Add new entries at the top of "Recent".

## Current state — 2026-11-17
- NMC foundation source accounting complete: registry @24, 2,865 draft objectives on 1,544 concepts, 2,633/2,634 NMC rows linked (PS9.2 deleted officially). No clinical or faculty review (owner skipped it); no learner activation; no question import.
- Concepts: 1,543 accepted private identities; subject revisions supported and applied to 328 concepts.
- Syllabus checklist functions read current identities (migration `20261117150000`).

## Recent

### 2026-11-18 — Automated accessibility audit (axe-core, WCAG 2.2 A/AA)
- New `scripts/accessibility-browser-check.js`: audits 17 learner-facing/public pages at phone (390), tablet portrait (820), tablet landscape (1180) and desktop (1440) with axe-core 4.14.1 in the Chromium CI job. External requests blocked; `bypassCSP` is used only so the test can inject axe (production CSP unchanged).
- Gate (`scripts/accessibility-gate.js`, tests in `tests/accessibility-gate.test.js`): serious/critical violations fail CI unless recorded with a reason in `ops/accessibility/baseline.json` (empty; never auto-refresh). Moderate/minor are advisory. JSON report is uploaded with the screenshots artifact.
- Scope limits: signed-out/public render states only; signed-in learner states, admin pages and WebKit are not yet audited. axe catches roughly a third to half of WCAG issues; it does not replace manual review.
- First CI run (axe 4.14.1, 68 audits): no moderate/minor findings; one serious `color-contrast` failure on `/web/account.html` at tablet portrait and landscape. Root cause was a layout bug: at <=1220px the shrunken phone illustration's tab bar overlapped the dark "Start today's plan" button, putting muted text on dark green. Fixed in `web/account-landing.css`: the tab bar now has its own opaque background and divider, and the illustration's spacing is tightened at <=1220px so the full mock screen fits. Desktop unchanged. The sign-in content guard hash (`tests/fixtures/signin-content-baseline.json`) was updated for this intentional, reviewed CSS change.
- Verified locally: full `npm test` (1,730 pass) and `npm run check`; brand, public-policies, public-home and auth-recovery browser checks pass; tablet/desktop screenshots inspected. Baseline remains empty.

### 2026-11-18 — Confusion pairs ("commonly confused with")
- `data/nmc-concept-confusions.json` (new): 173 AI-drafted undirected pairs across 324 concepts, each with the key discriminator (e.g. nephrotic vs nephritic, DKA vs HHS, open- vs angle-closure glaucoma, hanging vs strangulation). Validated by `src/domain/nmc-concept-confusions.js`; source `ops/nmc/confusions/pairs.json`; builder `ops/nmc/build-concept-confusions.js`.
- Purpose: misconception detection (a wrong answer that picks the confused concept) and compare cards. Not faculty-reviewed; not yet used by the app.

### 2026-11-18 — Cross-concept prerequisites complete (all 19 subjects)
- Added preclinical/paraclinical internal links: Physiology 133, Biochemistry 71, Pathology 105, Pharmacology 68, Microbiology 32, Anatomy 119 (incl. clinical anatomy and embryology chains). Total 1,600 links (1,234 essential); 1,269 of 1,544 concepts have at least one prerequisite. The remaining 275 are structures, laws, programmes or skills without a real prerequisite.
- The cycle check caught one cross-batch contradiction (Antimicrobial resistance vs Antimicrobial chemotherapy); kept chemotherapy → resistance.
- AI-drafted; not faculty-reviewed; not yet used by the app.

### 2026-11-18 — Cross-concept prerequisites: all clinical and paraclinical subjects
- Added Community Medicine 67, Forensic Medicine 61, ENT 52, Ophthalmology 49, Orthopaedics 45, Dermatology 35, Psychiatry 15, Anaesthesia 19, Radiology 17 links. Total 1,072 links (817 essential) across 771 concepts; acyclic; none over the review mark. Remaining: links inside preclinical subjects (Anatomy, Physiology, Biochemistry) and leftover paraclinical internals. AI-drafted; not used by the app yet.

### 2026-11-18 — Cross-concept prerequisites: Surgery, Paediatrics, OBG
- Added 137 Surgery, 134 Paediatrics and 100 OBG links (`ops/nmc/prerequisites/*.json`). Total 712 links (557 essential) across 479 concepts; acyclic, none over the 6-link review mark. Concepts already linked by an earlier subject keep their links. Unlinked remainders are structures, skills or programme topics without a real prerequisite. AI-drafted; not used by the app yet.

### 2026-11-18 — Cross-concept prerequisites: Medicine
- `data/nmc-concept-prerequisites.json` (new, separate from the objective registry): 341 AI-drafted "understand A before B" links for Medicine (271 essential, 70 helpful), covering 215 concepts; 16 Medicine concepts have no real prerequisite (skills, ethics, imaging) and are left unlinked. Direct prerequisites only; no cap per concept, more than 6 flagged (none).
- Validated by `src/domain/nmc-concept-prerequisites.js` (known concepts, no duplicates/self links, acyclic). Source list: `ops/nmc/prerequisites/medicine.json`; builder `ops/nmc/build-concept-prerequisites.js` adds subjects one at a time.
- Not yet shown in the app; not faculty-reviewed.

### 2026-11-18 — NMC foundation marked complete (subject-competency scope)
- Owner decision (ADR-138): foundation complete for the 2,633 live subject competency rows; AI-drafted objectives, no faculty review, no learner material.
- The five non-subject parts are kept separate in `data/nmc-non-subject-curriculum-deferred.json` (counts, overlap, recommendation, pointer to the retained audit branch `feat/nmc-support-cohort-reconciliation-20261103` @ `5524c5a`). AETCOM is the first candidate if ever needed.
- Production: nmc-admin-preview v29 on registry @28; owner-api v27 still on @27 (repo pins @28; redeploy pending, deferred to save usage).

### 2026-11-18 — Registry @28: quality-audit fixes
- Seeded audit (60 objectives, 60 prerequisite links, 20 confusion pairs): wording and NMC row matches sound; one systematic issue — 146 clinical-phase objectives carried the classifier's fallback 'mechanism' label.
- Owner rule: keep 'mechanism' only where the NMC competency text asks for it. Checked each against the official NMC 2024 text: 27 kept, 119 relabelled (treatment-selection 39, procedural-skill 16, ethics 10, prevention 10, others). Wording, IDs and bindings unchanged; same-concept prerequisites recomputed (1,532).
- Radial nerve injury ← Humerus fractures reversed (helpful); Abdominal examination → Abdominal pain in children now helpful; 3 general-vs-specific confusion pairs removed (170 left).
- Evidence: `docs/evidence/2026-11-18-nmc-fallback-task-relabels-v1.json`, `...-prerequisites-and-review-v3.json`. AI-authored; not faculty or clinical review.

### 2026-11-18 — Registry @27: duplicate wordings resolved; identity re-pin script
- The 8 @26 duplicate-wording findings are rewritten (GM9.8, GM14.1, GM14.2 split into their two skills; MI4.2/MI4.3 name their own condition). No IDs removed; all 2,865 objectives auto-checked. Evidence: `docs/evidence/2026-11-18-nmc-duplicate-wording-fixes-v1.json`, `...-prerequisites-and-review-v2.json`.
- `ops/nmc/repin-identity-digests.js <export.json> --write <n>` re-pins registry digests to current identities after owner label/alias edits (SQL export query in the script header).

### 2026-11-17 — NMC gaps closed: prerequisites, review state, owner edits, acceptance speed, GM28.18
- Registry @26 (PR #471): 1,549 same-concept prerequisite links on 1,015 objectives (know → recognise → act, then preclinical → paraclinical → clinical; acyclic). Cross-concept prerequisites not authored. `reviewState` from deterministic wording checks: 2,857 auto-checked, 8 needs-attention (duplicate wording). Evidence: `docs/evidence/2026-11-17-nmc-prerequisites-and-review-v1.json`.
- Acceptance speed: name-conflict check was ~320 ms per item at 1,543 identities (nested scan). New trigger-maintained `content_concept_identity_names` index (unique per name; reads current identities). Local check: 200-item batch over 302 identities in 373 ms.
- Owner edit path: `concept_identity_edit_v1` (label/aliases; append-only, digest-guarded, learner-visible refused) and `foundation_objective_revision_v1` (wording; registry = revision 0). owner-api `POST /concept-identity-edits` and `/foundation-objective-edits`; Admin foundation panel has Edit wording / Edit concept name. Owner edits are not faculty review.
- GM28.18: draft "COPD exacerbation management" is a narrower unaccepted proposal, not a duplicate; no change (ADR-137).
- Verification: `npm test` 1,714 pass; `npm run check`; `scripts/concept-identity-edits-db-check.js` on local PostgreSQL 16; PRs #471/#472 merged with all four checks green.
- Production: both migrations applied; name index backfilled (2,447 names); conflict check 6 ms in production (was ~320 ms). owner-api v26 and nmc-admin-preview v27 deployed. Not yet exercised with an authenticated Admin request from this session.

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
