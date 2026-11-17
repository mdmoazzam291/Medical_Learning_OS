# AI handoff — current state

Checked: 2026-11-17T17:00Z. Full history up to this date: [archive/AI_HANDOFF-through-2026-11-17.md](archive/AI_HANDOFF-through-2026-11-17.md) (read only when an older decision is needed). Always verify live `main`, open PRs and production before acting; this file is a snapshot.

## Owner standing instructions
- Complete the NMC foundation and necessary follow-up tasks; no private-bank question import yet.
- Faculty/clinical review is skipped by owner instruction (2026-11-17 19:29 IST). All objectives are AI-authored drafts; never describe them as clinically or faculty reviewed.
- Learner publication only on explicit owner instruction.
- Deploy via the Supabase MCP tools; do not work around environment permission checks.
- Merge only after Workers Builds, check, browser and webkit all pass.

## NMC foundation — state
- Source: NMC CBME 2024-09-12, pinned SHA-256 `aa601690…ae23c`; full text private in Drive, metadata only in the repo.
- Registry `data/nmc-learning-foundation-drafts.json` @25: 2,865 objectives, 2,866 bindings, 1,544 concepts; 2,633 of 2,634 NMC rows linked; PS9.2 is an official deletion and never binds.
- Source exceptions: printed codes are stored unchanged; resolutions live in `data/nmc-reference-overlay.json` (7 search aliases, 2 heading groups, 2 official replacements, 1 deletion). `validateFoundationDrafts(pack, catalogue, overlay)` requires the overlay and checks every exception binding against its overlay row. PS 2.1*: alias PS2.1 accepted for search only; the asterisk's meaning is unresolved.
- Concepts: 1,543 accepted private identities (learner catalogue has 1 concept). Subject-only revisions via `concept_subject_revision_batch_v1`; current identity = view `content_concept_current_identities`. 328 concepts revised (462 subjects added) on 2026-11-17.
- Production: owner-api v25 serving registry @25 (foundation data pinned by commit `1841c3a2` + SHA-256 in `supabase/functions/owner-api/_shared/foundation-data.js`); nmc-admin-preview v26 with the @25 Admin learner preview (2,865 items).

## Known gaps (from the 2026-11-17 audits)
- Registry @25 adds task re-tag, taskFacets, population/jurisdiction and assessability (see STATUS). Still 0 prerequisites.
- No per-objective review status; no Admin edit path for labels/aliases/objective wording.
- GM28.18: draft respiratory-slice concept C-f2c27acd vs accepted Obstructive airway disease C-e8c03208 (deferred).
- Batch acceptance RPC times out above ~60 new concepts (8 s).
- Source-exception batch metadata says `subjectId: surgery` although it spans nine subjects (accepted file is checksum-pinned; reports should use `subjectIds`).
- Open-PR clean-up done 2026-11-17 (see `docs/PR_INVENTORY-2026-11-17.md`): groups A–E (73) closed with branches kept; PARSE rebrand #203/#228 closed by owner decision, branches pending manual deletion by the owner (proxy blocks ref deletion); #229 replaced by a fresh test PR.

## Next actions
1. Deferred foundation gaps above, in owner-chosen order (prerequisites, per-objective review status, Admin edit path, GM28.18, acceptance RPC speed).
Product rules: `docs/PRODUCT_PRINCIPLES.md`.
