# NMC Foundation — Exception Ledger (16 November 2026)

Historical exception inventory reconciled against draft PR #421 at `6fcde19` (main `55bae73`, unchanged). **Not authorization to modify, merge or publish.** No hold was removed to make counts agree. Full record: `docs/evidence/2026-11-16-nmc-exception-ledger.json` (204 records after the 16 Nov update; 198 at first issue, stable `nmc-exc:` IDs). Official wording is kept in the private Drive copy only (`exception-ledger-v1-20261116-with-official-wording.json`, Drive ID `1EJ6WWVno8xSSmDiAjax5zdyJzCE2h20e`, 552,314 bytes, size-verified). Draft-task text in this ledger already exists in committed repo packets; no new official wording is published.

Reviewer for every record: Claude, AI editorial check against the pinned PDF (SHA `aa601690…`). No human or faculty review has occurred.

## Reconciliation against PR #421

| Status | Items |
|---|---|
| Already resolved (verified) | PA22.4, PA22.5 (mode holds resolved on pinned PDF); Paediatrics printed total (source inconsistency, no missing rows) |
| Superseded | PY11.6 (hold withdrawn; PDF level P) |
| Still held | 21: 9 session-review holds, 7 source-exception mode holds, 5 earlier proposals (GM3.16, GM26.5, GM16.10, GM6.15, GM13.16) |
| Proposed, awaiting owner/faculty decision | 173: 149 earlier proposals, 15 spinal-cord links, 7 aliases, 2 topic labels |
| Duplicated | None. OR2.9 ("OR2. 2.9") and AS5.4 ("ASS.4") carry both an alias and a mode hold on the same reference; SU24.3/SU27.1/27.4/27.6/27.7 carry a mode hold and belong to a topic-label group. Linked, not duplicates. |
| Not found | None. Every reference exists in the catalogue and the pinned PDF. |

Count notes: the inventory listed 153 earlier proposals; the repo holds 154 references (153 proposals + GM3.16 without a proposal) and all 154 are ledgered. The listed 9 subject-review holds correspond to 11 records in the session-holds file (9 held + PA22.4/22.5 resolved) plus the withdrawn PY11.6. SU5.2 was withdrawn before this ledger.

## Categories

- **Subject-review holds (9 held):** BC14.18, FM1.5, FM14.13, GM10.15, GM24.1, OG30.2, OR2.16, PA2.2, PA8.5. Each hold reason re-confirmed on the pinned PDF text; proposals exist but are not applied.
- **Source-exception mode holds (7 held):** SU24.3, SU27.1, SU27.4, SU27.6, SU27.7, OR2. 2.9, ASS.4. PDF level KH with practical drafts.
- **Misprinted-code aliases (7 proposed):** "14.1" → BC14.1; "PA.29.1" → PA29.1; "MI 8." → MI8.3; "FM2:12" → FM2.12; "PS 2.1*" → PS2.1; "OR2. 2.9" → OR2.9; "ASS.4" → AS5.4. Search aliases only; the printed code remains the source identifier and no new official ID is created.
- **Surgery topic labels (2 proposed):** Surgery Topic 24 · Pancreatic disorders (SU24.1, SU24.2, SU24.3); Surgery Topic 27 · Vascular surgery (SU27.1, SU27.2, SU27.3, SU27.4, SU27.5, SU27.6, SU27.7, SU27.8). No printed heading exists; labels are navigation metadata, not competencies.
- **Spinal-cord identity links (15 proposed):** all scope-aligned as partial tasks; identities stay accepted-private and separate; no merge proposed.
- **Earlier correction proposals (154):** reviewed in one auditable batch (term coverage of the official row, terms outside the row, mode against PDF level), then all 44 flagged items read individually. 149 proposed, 5 held. Mean official-term coverage rose from 0.30 (original drafts) to 0.77 (revised). Six proposals are written as amendment instructions rather than final objective text (PE11.4, GM26.22, GM26.3, GM27.9, GM28.8, plus held GM26.5).
- **Paediatrics printed total (verified):** heading prints "Topics:35, Competencies: 406" (PDF p.329, rendered check). Three reproducible counts give 253 rows (tables, text-layer code tokens, catalogue); the 32 printed topic headings each state a count, and those counts sum to 253 and match row-by-topic (Topic 21 prints "(050", read as 5). The heading total is internally inconsistent; no competencies are missing and none are created.

## Printed-total audit (resolved as source inconsistencies, 16 Nov update)

`docs/evidence/2026-11-16-nmc-printed-count-audit.json` compares each subject heading total, the per-topic printed counts and the table rows. Six more ledger records (verified) were added; the ledger now has 204 records.

| Subject | Heading total | Per-topic sum | Table rows | Cause |
|---|---|---|---|---|
| Medicine | 525 | 531 | 532 (529 codes) | GM8.9 never printed (8.8 → 8.10, p.295); Topic 9 prints 21 for 17 codes; Topic 27 prints 15 for 18; GM9.8, GM14.1, GM14.2 printed twice |
| Surgery | 133 (30 topics) | 122 | 132 | Topics 24 and 27 unheaded (10 rows); SU26.2 never printed (26.1 → 26.3, p.409); SU27.1 counted under Topic 26 |
| Ophthalmology | 60 | 59 | 59 | Heading total off by one |
| OG | 141 | 137 + 5 uncounted | 142 | Topic 22 unnumbered; Topic 33 prints no count |
| ENT | 63 | 61 | 63 | Topic 3 prints 1 for 3 rows |
| Orthopaedics | 40 | 39 | 40 | Topic 14 prints 3 for 4 rows |
| Paediatrics | 406 (35 topics) | 253 | 253 | Heading total inconsistent with body |

No row was created, filled or removed to make counts agree; numbering gaps are recorded, not filled.

## Held-proposal reworks (16 Nov update)

`docs/evidence/2026-11-16-nmc-held-proposal-reworks.json` drafts reworked wording for GM26.5 (all listed tests, knowledge mode), GM6.15 (pathogenesis and management only), GM16.10 (identification only), GM13.16 (knowledge mode to match KH) and GM3.16 (all row elements, no added disease context). All five remain **held** until owner/faculty decision; GM3.16 also needs source interpretation.

## Owner decisions (16 Nov, owner approval)

`docs/evidence/2026-11-16-nmc-owner-decisions.json` records one decision per ledger record under the owner's approval: 170 objective revisions accepted, 7 aliases, 2 labels, 15 spinal-cord links attested, 7 printed totals annotated, 2 optional proposals declined, 1 no-action. The ledger dispositions above remain the pre-decision history. Faculty/clinical review, Admin-console receipts, merge and publication are still outstanding.

## Remaining actions

1. Done 16 Nov: owner decisions recorded. Optional: faculty/clinical review of the 170 accepted revisions.
2. Spinal-cord link attestation: owner chose the repository record (16 Nov amendment in the owner-decisions file); no Admin-console receipt exists or is planned. Learner publication needs separate explicit approval.
3. Record the Paediatrics heading total as a source inconsistency in any learner-facing count.
4. Decide whether to report the printed-total inconsistencies to NMC or simply annotate them.
