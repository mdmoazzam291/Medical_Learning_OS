# NMC Official Source Ingestion — 16 November 2026

Status: source-grounded extraction and reconciliation complete; nothing accepted. Draft PR #421 only.

## Deliverables

| Deliverable | Location |
|---|---|
| Verified source-document manifest | `docs/evidence/2026-11-16-nmc-official-source-manifest.json` |
| Subject-wise competency inventory (metadata, public) | `data/nmc-competency-source-metadata.json` (2,634 rows) |
| Full-text machine-readable dataset (private) | Drive `07_Release/NMC_CBME_2024_Competency_Foundation_v1_20261116` (`COMPETENCIES.md` and the dataset in three volume parts) |
| Source-page evidence | `pdfPages`, `printedPages`, `evidenceStatus`, `rowHashReproduced` per row |
| Reconciliation report | `docs/evidence/2026-11-16-nmc-competency-reconciliation.json` and the section below |
| Validation tests | `tests/nmc-source-ingestion.test.js` |
| Extractor | `ops/nmc/extract_competency_tables.py` (output contains source text; keep out of the repo) |

## Result

- **2,634 competency row appearances extracted** from 19 subject tables in Volumes I–III; **2,634/2,634 match the repo reference catalogue one-to-one** (0 missing, 0 extra). 399 topic-heading appearances match the catalogue.
- 2,607 are in the repo names-only index; the other 27 are the 21 recorded source exceptions and 6 spinal-cord canonical-identity rows. No unaccounted reference.
- **0 conflicts** between extracted levels and every level recorded in repo evidence packets.
- Holds, proposals and canonical identities are unchanged. Nothing is accepted by this ingestion.

## Evidence status

- row-hash-verified: 2586
- row-hash-verified-partial-body: 27
- text-layer-extracted-hash-not-reproduced: 18
- text-layer-extracted: 3

`row-hash-verified`: the repo row-body SHA-256 reproduced from the pinned PDF and the extracted description is contained in that body. `-partial-body`: the table cell continues beyond the repo row box (page-split or tall rows), so the extra text is table-extracted only. `hash-not-reproduced`: content matches but pdfplumber word-splitting differs from PyMuPDF. `text-layer-extracted`: no repo row box exists (3 rows).

## Uncertainty flags (rows can carry several)

- column-merged: 128
- spans-pages: 30
- table-cell-extends-beyond-repo-row-box: 27
- source-cell-blank: 15
- nonstandard-printed-value: 11
- identifier-unresolved: 7
- repeated-identifier-in-source: 6
- amendment-notice: 3
- no-repo-row-box: 3

2438 rows carry no flag. Column-merged rows come from tables whose header cells span two sub-columns; values were assigned to the spanning header and every one that has a level recorded in repo evidence agrees with it. Source-cell-blank values were confirmed on rendered pages for GM 11.5 and PE28.2–PE29.1.

## Reconciliation categories

| Category | Count | Notes |
|---|---|---|
| Exact match to catalogue reference | 2,634 | ID, page and printed code |
| Missing from repo | 0 | |
| Extra in repo | 0 | |
| Repeated identifiers in source (duplicate records) | 3 codes / 6 rows | GM9.8, GM14.1, GM14.2; printed twice with identical text; kept as separate appearances, not merged |
| Unresolved / malformed identifiers | 7 | "14.1", "PA.29.1", "MI 8.", "FM2:12", "PS 2.1*", "OR2. 2.9", "ASS.4"; aliases proposed, not accepted |
| Amendment notices | 3 | PY9.1, PE6.4 (official replacement), PS9.2 (deletion) |
| Wording variations vs repo | n/a | Repo holds no descriptions; drafts are editorial tasks, compared separately in review packets |
| Incorrect mappings found | 0 | Recorded domain/level all agree |

## Source-version conflicts (reported separately)

Printed subject totals disagree with the tables in five subjects:

| Subject | Printed topics | Topic headings | Printed competencies | Table rows |
|---|---|---|---|---|
| medicine | 29 | 29 | 525 | 532 |
| pediatrics | 35 | 32 | 406 | 253 |
| surgery | 30 | 28 | 133 | 132 |
| ophthalmology | 10 | 10 | 60 | 59 |
| obstetrics-gynaecology | 38 | 38 | 141 | 142 |

Paediatrics is the largest gap (printed 406, table 253). Surgery Topics 24 and 27 have no printed heading (recorded source exceptions). These are inconsistencies inside the official document; the table rows are treated as authoritative appearances and the printed totals are recorded, not corrected. The separate NMC clarification document referenced by the catalogue was not re-checked here.

## Rights

Full-text descriptions are stored only in this private Drive package. The public repository receives identifiers, pages, domain/level/core and description hashes.

## Remaining work

- Owner/faculty decisions: 9 session holds, 7 exception mode holds, 7 aliases, 2 heading labels, 15 identity links, 153 earlier correction proposals.
- Decide how to treat the printed-total conflicts (especially Paediatrics 406 vs 253).
- Byte-compare the wp-content copy used on 2026-11-13 and any separate per-volume PDFs with this file.
- Re-run hash verification with PyMuPDF 1.26.6 when installs are allowed, for the 18 rows pdfplumber could not reproduce exactly.
- No canonical acceptance, learner publication, database change or merge was made.

## Drive save receipt

Saved and size-verified in `07_Release/NMC_CBME_2024_Competency_Foundation_v1_20261116` (folder `1C7zJK7t0pZhvXe9UPg7imdjDkxPTAd-k`): `COMPETENCIES.md`, `topics.jsonl`, `source-manifest.json`, `reconciliation.json`, `RECONCILIATION_AND_QUALITY.md`, `package-manifest.json`.

Dataset saved as three volume parts (concatenation is byte-identical to the 4.9 MB `competencies.jsonl`, SHA-256 `8d109b00…18c9`): `competencies-volume-I.jsonl` (1,139 rows, `13e5ad92…aeb5`), `competencies-volume-II.jsonl` (986 rows, `6a6de6c8…c8b`), `competencies-volume-III.jsonl` (509 rows, `068d92a4…c9`). Sizes verified on Drive.

**Pending owner upload:** the original PDF (4.1 MB) into `02_Originals/Content/NMC_CBME_2024` (folder `16xBSjquHtMFTinZu2Wsep57EKLHAh5UN`); it exceeds the session's 3.1 MB per-file connector limit and was sent to the owner on 2026-11-16.
