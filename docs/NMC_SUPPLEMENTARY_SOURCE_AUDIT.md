# Supplementary source audit checkpoint
Date2026-10-30. See docs/evidence/nmc-supplement-sources.json for exact10 official URLs, byte hashes, sizes/page counts, embedded scopes and open applicability decisions.

## Completed
Recovered and hashed10 PDFs linked by the current NMC UG Curriculum index: AETCOM, foundation, early clinical exposure, assessment, alignment/integration, skills, logbook, electives, pandemic management and online learning/assessment. These are individually versioned legacy supporting documents, not10 new2024-approved competency lists.
All10 local PDFs parsed and page counts matched web retrieval. No PDF bytes or protected source descriptions committed.
Visually inspected AETCOM PDF87, base2024 PDF48(annexure index) and54(foundation). AETCOM appendix declares1-39 core and40-54 desirable:54 source-declared records, not a verified effective denominator. Distinguish competency entries, learning modules and repeated appearances. This declaration and module index require separate page-level reconciliation.

## Applicability and double-counting
2024 Annexure4 specifies2 weeks/80 hours for foundation; retain this exact version rather than inherit older booklet timing. AETCOM governance PDF49-50 and family adoption PDF65-71 belong in the embedded scope register. Skills/certification and logbook evidence may repeat subject requirements: record cross-links instead of adding them blindly to2781.
2024 annexure13 is labelled draft research-facility/manpower guidance, not automatically learner competencies. Admission/PwBD assessment policy is also a separate scope from clinical competencies relating to disability. Full global-role and supplemental requirement enumeration remains incomplete.
Rights remain citation_only; source links/hashes do not confer reproduction permission. No curriculum wording or full table copied.

## Later amendments
Checked official rules index and targeted two-engine searches for2025/2026 CBME amendments. October2024 clarification remains the specifically retrieved competency amendment. UGMSR2025/2026 institutional standards and2026 PwBD admission-assessment notices surfaced and require separate classification; do not presume either revises the coded subject inventory.
This was not an exhaustive crawl or legal determination. Later-amendment audit remains open; no claim that no later notice exists. Older2023 corrigenda and withdrawn August2024 remain distinct editions.

## Validation/status
10 unique source IDs/URLs, actual64-hex SHA256 values, positive bytes/pages and per-source pending review flags validated. Total downloaded pages: 560. JSON round-trip checked. This is evidence documentation only; no runtime tests rerun or fresh CI claimed.
No ingestion, source approval, medical/rights approval, exam mapping, merge/deploy or learner activation.
Next concrete work: enumerate AETCOM appendix87 onward and module boundaries independently; reconcile39 core/15 desirable with subject overlaps and2024 governance before defining an effective supplemental denominator. Complete other supplemental requirement/page inventories and later-notice applicability afterward.

## AETCOM appendix appearance audit — 3 November 2026

Implemented `ops/nmc/aetcom_appendix.py` against the exact 94-page legacy AETCOM booklet (SHA-256 f752cfe4ef694f60f89f7e709a29c4d8167672928dd248dfb9bd34414bc13766). `docs/evidence/nmc-aetcom-appendix-locators-v1.json` freezes 54 numbered row appearances on PDF 87–91 and 14 additional unnumbered appearances on PDF 92–93. The contiguous source sequence 1–54 is verified; the note on page 87 declares 1–39 core and 40–54 non-core/desirable. These are source-declared legacy classes, not current applicability decisions.

Nine of the 14 additional appearances have exact body-text matches to numbered entries after whitespace collapse: entry 37 (source-declared core), and entries 41–47/53 (source-declared desirable). The additional list is labelled non-core, creating an explicit classification conflict for the exact match to entry 37. Pages 90 and 92 were rendered and visually inspected for that appearance/classification context; this is targeted AI source inspection, not complete visual or independent clinical review. Five additional appearances have no exact whitespace-collapsed match under this method. They are not automatically unique requirements: differences may be lexical, partial or semantic and remain unadjudicated.

The 68 total physical appearances must not become a 68-competency denominator. Nor should nine matching appearances be automatically removed to declare a corrected count. Source ordinal, local ordinal for unnumbered appearances, body coordinates, original reconstruction hashes, whitespace-collapsed comparison digests, level anchors and source-bound IDs are retained separately. Comparison normalization is only a matching diagnostic; physical identities retain the original reconstructed body hash. No body wording, full code corpus, source PDF or rendered page enters Git.

```sh
python3 ops/nmc/aetcom_appendix.py /private/AETCOM_book.pdf /private/aetcom-appendix.json
python3 -m unittest discover -s ops/nmc -p 'test_*.py' -v
```

The source-specific level-column threshold is x >= 510 to separate level markers from the domain K/S column. Long horizontal body-column borders bracket candidate regions. The common helper now accepts that threshold with its original pandemic default unchanged; a new actual-source pandemic rerun matches the checked-in pandemic evidence byte-for-byte. This is a version-bound geometry method, not an exhaustive semantic parser.

Two actual AETCOM runs and an independent engineering rerun are byte-identical: 34,656 bytes, SHA-256 e413a8baa908f0cbe697b45d3929be1ffcfa3bc13e1ae156258d0770d8ae58ff. All 52 NMC Python tests and repository checks pass. Independent review verified the class declaration and exact-match counts; no actionable findings. Fresh hosted CI for this implementation is not yet verified.

This advances the appendix enumeration but does not reconcile module-body appearances, 2024 governance/cohort applicability, subject overlaps, clinical equivalence, rights or exam overlays. The existing AETCOM source cases and frozen review package remain unchanged and pending. No source approval, learner activation or production deployment.
