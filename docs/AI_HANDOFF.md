# AI handoff — current state

Checked: 2026-11-17T20:25Z. Full history up to this date: [archive/AI_HANDOFF-through-2026-11-17.md](archive/AI_HANDOFF-through-2026-11-17.md) (read only when an older decision is needed). Always verify live `main`, open PRs and production before acting; this file is a snapshot.

## Owner standing instructions
- Complete the NMC foundation and necessary follow-up tasks; no private-bank question import yet.
- Faculty/clinical review is skipped by owner instruction (2026-11-17 19:29 IST). All objectives are AI-authored drafts; never describe them as clinically or faculty reviewed.
- Learner publication only on explicit owner instruction.
- Deploy via the Supabase MCP tools; do not work around environment permission checks.
- Merge only after Workers Builds, check, browser and webkit all pass.

## NMC foundation — state
- **Status: complete for the subject-competency scope (ADR-138, owner 2026-11-18).** Non-subject parts (AETCOM, Foundation Course, ECE, pandemic modules, electives/FAP/logbook) are kept separate in `data/nmc-non-subject-curriculum-deferred.json`; add only on owner decision.
- Source: NMC CBME 2024-09-12, pinned SHA-256 `aa601690…ae23c`; full text private in Drive, metadata only in the repo.
- Registry `data/nmc-learning-foundation-drafts.json` @27: 2,865 objectives (1,549 same-concept prerequisite links; reviewState auto-checked/needs-attention), 2,866 bindings, 1,544 concepts; 2,633 of 2,634 NMC rows linked; PS9.2 is an official deletion and never binds.
- Source exceptions: printed codes are stored unchanged; resolutions live in `data/nmc-reference-overlay.json` (7 search aliases, 2 heading groups, 2 official replacements, 1 deletion). `validateFoundationDrafts(pack, catalogue, overlay)` requires the overlay and checks every exception binding against its overlay row. PS 2.1*: alias PS2.1 accepted for search only; the asterisk's meaning is unresolved.
- Concepts: 1,543 accepted private identities (learner catalogue has 1 concept). Subject-only revisions via `concept_subject_revision_batch_v1`; current identity = view `content_concept_current_identities`. 328 concepts revised (462 subjects added) on 2026-11-17.
- Production: owner-api v27 (registry @27 pinned by commit `3c65f32` + SHA-256; edit routes `/concept-identity-edits`, `/foundation-objective-edits`); nmc-admin-preview v28 (@27 Admin learner preview). Migrations `concept_identity_name_index` and `admin_identity_and_objective_edits` applied 2026-11-17; name index backfilled (2,447 names, 1,543 identities); conflict check 6 ms (was ~320 ms).

## Known gaps
- Cross-concept prerequisites: complete for all 19 subjects (1,600 links, 1,269 concepts; `data/nmc-concept-prerequisites.json`), one at a time via `ops/nmc/build-concept-prerequisites.js`. Not yet used by the app.
- After an owner identity edit, linked objectives show "changed" until re-pinned with `ops/nmc/repin-identity-digests.js`.
- Source-exception batch metadata says `subjectId: surgery` although it spans nine subjects (accepted file is checksum-pinned; reports should use `subjectIds`).
- PARSE branches `docs/parse-brand-identity-20261008` and `feat/parse-preview-brand-20261013` await manual deletion by the owner.

## Next actions
1. Use the prerequisite graph in the app (topic page "Builds on", Study Now ordering) once learner content exists; validate links against learner data.
2. Owner: delete the two PARSE branches on GitHub.
Product rules: `docs/PRODUCT_PRINCIPLES.md`.
