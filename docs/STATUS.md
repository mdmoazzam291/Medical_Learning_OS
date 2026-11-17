# Status

Current state and recent entries. Entries up to 2026-11-17 are archived in [archive/STATUS-through-2026-11-17.md](archive/STATUS-through-2026-11-17.md) (unchanged). Add new entries at the top of "Recent".

## Current state — 2026-11-17
- NMC foundation source accounting complete: registry @24, 2,865 draft objectives on 1,544 concepts, 2,633/2,634 NMC rows linked (PS9.2 deleted officially). No clinical or faculty review (owner skipped it); no learner activation; no question import.
- Concepts: 1,543 accepted private identities; subject revisions supported and applied to 328 concepts.
- Syllabus checklist functions read current identities (migration `20261117150000`).

## Recent

### 2026-11-17 — Overlay-checked registry validation; history archived
- `validateFoundationDrafts` and `foundationDraftPage` now require the reference overlay; each exception binding must match its overlay row (search alias or topic group for resolved codes/headings, official replacement for amendment rows); deleted rows never bind. Negative tests cover a missing overlay, a missing row, a wrong kind, a forged basis, a deleted row and a standard row claiming an exception basis. owner-api loads the overlay as a seventh pinned data file.
- PS 2.1* overlay note corrected: printed form kept; PS2.1 is a search-only alias; asterisk meaning unresolved.
- STATUS.md and AI_HANDOFF.md history moved unchanged to `docs/archive/`; both files now hold current state only. PROJECT_CONTEXT.md reconciliation date updated.
