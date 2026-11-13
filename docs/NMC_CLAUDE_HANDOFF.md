# NMC Foundation — provider handoff

Checked 2026-11-13. This checkpoint supersedes older next-queue instructions in the historical handoff below; it does not supersede archived source findings.

## Resume target and ownership

- Repository: `mdmoazzam291/Medical_Learning_OS`.
- Resume branch: `docs/nmc-am-scope-batch-01-20261112`, draft PR #421.
- Initial evidence audited from commit `5252e41e94e8dada7db7f66d00fcf522899cfd72`; transfer follow-up based on `45aa7f46e7fad1cfb6d76fa89c54fbba977d1af0`; use the current remote PR head, which includes this checkpoint.
- Parent draft PR #415 remains at `a8da95296e1a738a90b2a438985420af39ec19c2`; verified remote main was `55bae73f1e01c0ce2a60b14dc3fa910b1e8bc5fe`.
- Outgoing ChatGPT writer releases ownership after saving and remote verification. No outgoing deployment or external background job was started. Incoming Claude must verify current refs and claim only one writing task.
- Read `AGENTS.md`, `docs/AI_CONTINUITY.md`, `docs/AI_HANDOFF.md`, this file, and current status. `CLAUDE.md` already imports the shared instructions. No account connection or Claude configuration has been performed by this checkpoint.

## Completed before transfer

1. Reconciled all 22 Paediatrics cross-subject pairs by exact name and both reference IDs: 4 provisional topic reuse, 8 shared-topic candidates, 6 shared task families, 3 population-specific tasks and 1 held narrow link. No duplicate or missing pairs; original endpoint codes and decisions preserved.
2. Carried source holds from **both** endpoints: `PA26.7`, `GM14.7`, `GM14.6`, and `PE11.4`. The latter was absent from the previous conversational summary but is present in the original 154-reference hold inventory. `AS9.1` is a separate link hold. No hold was resolved or accepted by this reconciliation.
3. Added a reproducible editorial evidence audit across all 19 indexed subjects. Original Anatomy/Medicine queue: 797 names and all 944 references have linked review evidence. Paediatrics: 249 names and all 252 Paediatrics references have linked review evidence. This is editorial review accounting, not clinical/canonical acceptance.
4. Fixed a pre-existing portability-check failure: removed the single baseline entry for a staging workflow absent from the branch. No workflow or infrastructure was added.
5. Full index: 2,427 names / 2,607 distinct source references; 1,205 references link to the selected review packets and 1,402 do not. Missing links require reconciliation against older evidence before new review. These counts exclude the separate source-exception track and must not be represented as entire NMC curriculum coverage.

Authoritative generated outputs:
- `docs/evidence/2026-11-13-nmc-paediatrics-relationship-reconciliation.json`
- `docs/evidence/2026-11-13-nmc-provider-handoff-review-audit.json` — per-subject counts, every pending reference with source packet/page/code, review links, input SHA-256 manifest and verification limits.

Run `python scripts/nmc-review-handoff-audit.py` from the repository root. It fails on stale generated outputs, missing/duplicate decision pairs, endpoint/code mismatches and accepted mapping flags. Inspect changes before using `--write`; regenerated accounting cannot establish source or clinical acceptance.

## Exact next tasks, in priority order

1. Historical evidence linkage for the 14 Anatomy/Medicine references is now complete in `2026-11-13-nmc-am-fourteen-evidence-reconciliation.json` (6 Anatomy, 8 Medicine). Each entry includes exact prior record pointers and original task metadata. Earlier name/scope proposals are weaker than full official-source checks: all 14 still require that verification before closure. The main audit counts remain unchanged; do not treat these links as accepted mappings.
2. Continue broader subject review with **Pathology**: 174 indexed references lack a link to the selected review packets (the older 171 count measured exact-label nonmatches, a different metric). Use the prepared `2026-11-13-nmc-pathology-next-review-batch.json`: 60 exact references PA1.1–PA16.2, with original task and packet hashes. They are queued, not reviewed. Check existing source evidence first; reduce the batch for ambiguous rows. Preserve all IDs, source editions, hashes and modes. Next largest queues by this audit: Forensic Medicine 156, Obstetrics/Gynaecology 141, Community Medicine 135, Physiology 131, Surgery 116. Recompute after each batch; shared references count once per source ID.
3. Retain the 154 original source-objective holds. `2026-11-13-nmc-held-correction-source-verification-inventory.json` records 153 correction proposals plus the GM3.16 interpretation track, with linked text-layer evidence. These are still drafts. Integrate proposed full objective revisions only with explicit versioned evidence; do not silently rewrite archived packets or invent clinician acceptance.
4. Keep the 12 accepted-private identity candidates in `2026-11-12-nmc-full-index-coverage-and-canonical-candidates.json` separate from accepted source mappings. Historical 2,346 exact-preview-label nonmatches are not a current completion count.
5. Keep the 21 source exceptions separate: checkpoint `2026-11-13-nmc-source-exception-current-branch-checkpoint.json` records 3 official dispositions and 18 editorial proposals (7 aliases, 11 Surgery headings). Later alias evidence is in `2026-11-13-nmc-source-alias-and-paediatrics-opening-review.json`. PE6.4 uses the official replacement packet. Preserve original codes/aliases; do not turn inferred aliases into official corrections.
6. Before integration, assess PR dependencies and current main. Many older NMC and unrelated PRs remain open; open does not mean independently mergeable or still needed. Do not bulk-merge or discard them. PR #420 and #412 are separate workstreams. Keep PR #421 and #415 draft until their actual integration conditions are met.

## Boundaries and remaining verification

- All-subject source review is **not complete**. Canonical binding, approved teaching content, source rights and learner publication are separate incomplete milestones.
- This run reconciles existing evidence, without fresh official PDF byte rehashing, rendered-page verification or clinical review. Older per-packet verification claims remain attributed to those packets.
- Staging sign-in remains deferred. No production release, DB writes, learner content publication or canonical acceptance is authorized by this transfer.
- Full repository tests/check results are recorded in the current AI_HANDOFF/STATUS entry. No hosted/browser acceptance was performed for this evidence-only change.
- Local transfer gap reconciled: 12 dirty-file appearances across the two inspected older worktrees comprise 8 byte-identical files already saved, 3 earlier versions superseded by current code, and 1 unused staging workflow. `2026-11-13-nmc-local-worktree-transfer-reconciliation.json` records hashes/dispositions. Inert recovery text preserves the workflow and a patch reconstructing the three old versions. Do not apply/run recovery automatically. Original worktrees were not modified; no claim covers other uninspected devices or files.

## Short instruction for Claude

Continue NMC Foundation on draft PR #421 in mdmoazzam291/Medical_Learning_OS. Fetch its current head and read AGENTS.md, docs/AI_HANDOFF.md and docs/NMC_CLAUDE_HANDOFF.md. Run the handoff audit, read the completed 14-reference historical evidence reconciliation, then verify their official source scopes or take the prepared 60-reference Pathology batch while preserving those gaps. Preserve all source/canonical IDs and holds. Save verified work to the same branch, update handoff/status, and report completed/held counts and remote SHA. Keep staging sign-in deferred; do not merge or publish.
