# NMC catalogue-first implementation plan

Goal: browsable core competency references and shared topic groups, without duplicating learning content.
Architecture: deterministic offline extraction from pinned source geometry; static factual metadata; provider-independent filtering/grouping; dedicated browser linked from Library.
Spec: ../specs/2026-11-03-nmc-catalogue-first-design.md

- [ ] Test row preservation, repeated/malformed IDs, narrow topic grouping, amendment flags, filtering and pagination.
- [ ] Generate all defining reference rows from the existing 2,634 source regions. Retain exact region identities; publish no objective prose. Check reconstruction and counts.
- [ ] Implement read-only topic/code browser, source detail links, URL filters, responsive layout and Library entry.
- [ ] Run tests/check/build and phone/tablet/desktop browser flows; review diff; checkpoint and update handoff/status/decision with remaining limitations.

Review focus: generic headings must not merge across disciplines; repeated codes keep separate appearances; search/filter changes reset pagination; malformed codes never become silently corrected identities; metadata browser cannot activate mastery/clinical content.
