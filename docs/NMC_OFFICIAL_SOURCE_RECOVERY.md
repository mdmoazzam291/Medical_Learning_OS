# Official NMC source recovery and amendment receipt
Checked 2026-10-30. PR346 documentation-only investigation; no approval or runtime changes.

## Primary source retrieval
Discovered via https://nmc.org.in/page/rules-regulations-rules-regulations-nmc links labelled 2.3 and 2.3.a.
- Revised September12 curriculum: https://nmc.org.in/rules-regulation-nmc/33/file
  Downloaded actual PDF bytes: 4,113,924; 467 pages; SHA256 aa601690b9e92b74f7412973a70969539e93210b41829018f052059bbf5ae23c.
- October10 covering notice and clarification: https://nmc.org.in/rules-regulation-nmc/34/file
  Downloaded actual PDF bytes: 250,969; 4 pages; SHA256 62a60b29a1fd5a97f2fcac4a1c3761286f2dac2c371e76047f5ea8cbccb13db0.
These official-host downloads resolve the previous inability to retrieve primary bytes for this source pair. Prior legacy URLs failed; use current locators above. This is provenance evidence, not independent clinical/rights review or proof no later amendment exists.

## Mirror comparison
UCMS mirror remains 466 pages, SHA256 9bb9e28bd33f0bb6c00ee04bce8095da9f61086f0b2f917ded6daefc16d41db4.
The official PDF has a text-empty page2. After shifting subsequent mirror pages by one, all465 compared pages (mirror2-466 versus official3-467) have identical whitespace-normalized pdftotext output. Cover page1 was not included in this equality count.
All22 Paediatrics pages (mirror328-349, official329-350; printed88-109) have identical default PyMuPDF raster dimensions and sample bytes. Rendered official opening and ending pages inspected at higher resolution, plus clarification PDF3. Therefore the PE discrepancy is present in the official-host PDF too, not an observed mirror-only omission.
Official PE defining section yields253 whitespace-tolerant unique code candidates across32 observed topics versus heading35/406. Its last row is PE32.1. The discrepancy remains unresolved; neither invent153 missing items nor silently replace406 with253.

## Amendment impact: metadata only
Clarification PDF3 contains:
- PS9.2: deleted; Psychiatry section9 title amended.
- PY9.1: wording replaced; VolumeI printed83.
- PE6.4: wording replaced; VolumeII printed90.
- Disability competencies described as under review at the time; later applicable notices still need separate investigation.
No protected replacement descriptions reproduced here. Preserve base source identities with amendment-specific status/version, including a tombstone for deleted PS9.2; do not count deletion as a missing competency or silently erase history.
The October document does not resolve the PE35/406 heading discrepancy. The September published2781 is a base-document summary target, not automatically the effective post-amendment denominator. Do not simply subtract one and certify2780: full exact-set reconciliation is still required.

## Verified and pending
Verified this turn: primary-byte retrieval/hashes, full shifted-text comparison, PE22-page raster equivalence and key amendment-page inspection.
Pending: every subject defining-row/code audit, GM/OG extras, prefix aliases, supplementary requirements, later amendments, independent review, exact concept and exam-overlay mappings.
No code/DB/source-ledger state changed. No PDF bytes, protected descriptions or bulk source table committed. citation_only maintained. No runtime tests rerun for documentation-only changes; fresh CI not yet verified.
Next: reconcile GM529/525 and OG142/141 by defining rows versus references using the recovered official PDF; then produce edition-qualified metadata inventory with amendment statuses.
