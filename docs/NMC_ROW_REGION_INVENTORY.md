# Reproducible NMC defining-column region inventory

Status: unreviewed engineering evidence; not a no-omission, clinical, rights or exam-scope approval.

## Source and scope

The local input is the official revised 12 September 2024 PDF from https://nmc.org.in/rules-regulation-nmc/33/file: 467 pages, SHA256 `aa601690b9e92b74f7412973a70969539e93210b41829018f052059bbf5ae23c`. Its 10 October clarification is separately available at https://nmc.org.in/rules-regulation-nmc/34/file and remains part of the existing amendment review. The new scanner uses only the 263 defining-table pages and candidate first-column bounds in `docs/evidence/nmc-codecell-page-receipts.json`. It does not independently establish that this page scope is exhaustive.

The former detailed geometry extraction was transient. `ops/nmc/codecell_inventory.py` now specifies the actual extraction method and persists every newly extracted candidate region as source-bound coordinates, classification and digests. `docs/evidence/nmc-row-region-inventory-v1.json` contains no raw source words, full code list, source descriptions, tables or PDF bytes. Physical region IDs are not canonical medical concepts or approved competency identities.

## Repeat the actual extraction

Use a local copy with the exact hash above and PyMuPDF 1.26.6. The optional PDF dependency is not installed into the app or required for synthetic unit tests.

```sh
python3 -m pip install PyMuPDF==1.26.6
python3 ops/nmc/codecell_inventory.py /private/nmc-official.pdf /private/regions.json
python3 -m unittest discover -s ops/nmc -p 'test_*.py' -v
```

The scanner verifies source bytes, selected manifest pages/column order and actual 467-page count. It rotates word/vector rectangles into displayed coordinates, clusters horizontal first-column boundaries within 1 point, assigns words by first-column centre and vertical midpoint, and reconstructs lines within 5 points before hashing. This is a versioned candidate algorithm, not recognition of all true physical/clinical rows. An empty region means no words selected by this method, not an independently inspected blank cell; header also includes unclassified regions and is not an approved exclusion. Wrapped/malformed cells remain nonstandard; footnote-bearing tokens and repeated appearances are not silently corrected or deduplicated. It writes an exclusive new JSON file and has no network, DB, Auth, ingestion or deployment action.

Same source/method/manifest runs reproduced byte-identical output twice. A separate AI engineering reviewer rebuilt the object directly from the PDF and matched it exactly. That review is not the qualified independent source adjudication required by the existing 22-case packet.

## Actual results and unresolved differences

| Observation | New repeatable method | Historical receipt |
|---|---:|---:|
| Selected defining pages |263|263|
| Standard identifier candidates |2,627|2,627|
| Nonstandard identifier candidates |7|7|
| All identifier candidates |2,634|2,634|
| Empty candidate regions |320|253|
| Header/unclassified candidate regions |415|492|
| All candidate regions |3,369|3,379|

Every selected page matches the historical identifier-candidate count. This is count parity, not proof of identical code sets, correct classifications or complete competencies. Category counts differ on 67 pages. Ten pages have one fewer total boundary region: 162,187,206,215,269,329,403,427,444,452. Preserve this uncertainty; do not overwrite the old receipts or choose the method that makes a headline total match. The remaining differences involve empty/header classification and require source review. Earlier continuation proposals do not approve these new boundaries.

Representative official pages 108/169/172 were rendered and inspected locally for ordinary table boundaries, a prefixless code and a wrapped code. The images and source prose were not committed. This is not full-page-by-page review of 263 pages or 1,031 supporting-source pages.

The published 2,781 summary, PE 253/406 discrepancy, other subject differences, supplementary/global overlap, later amendments and 22 pending source decisions remain open. The eight application proposals still have zero source/rights approvals and no canonical/exam mappings. The new region metadata is not imported into them. All four approval/activation flags remain false; learner coverage stays unknown.

## Validation limits

Thirteen synthetic Python tests cover metadata-only output, physical identity/source changes, malformed/wrapped cells, empty/header retention, declared column ordering, strict page/hash/count/coordinate validation, input-order invariance and integer/float geometry identity. Current Node suite 1,568/check/build pass. CI runs the pure Python tests without fetching/rehosting NMC PDFs; the actual-source repeat is local evidence.

Optional follow-up tests remain for single-boundary/duplicate-only cases and direct CLI version mismatch, page mismatch and exclusive-output paths. Do not imply those dedicated negative scenarios ran. Engineering reproducibility is not source, clinical, rights, exam or production acceptance.

## Boundary sensitivity control

A diagnostic rerun changed only the clustering tolerance from 1.0 to 0.25 PDF points. It produced 3,379 regions with the same 2,634 identifier candidates. The ten additional regions occur on the same ten total-difference pages and are 0.39–0.51 points high, with no selected words; their exact boxes and empty-cell digests are saved in `docs/evidence/2026-11-02-nmc-boundary-sensitivity.json`. No page then differs in total region count from the older aggregate receipt, while 61 pages still differ in category counts under this trial.

This supports a segmentation-parameter explanation for the ten-region total difference. It does not reconstruct the unknown historical detailed extraction, validate all empty/header classifications, or approve exclusions. Version 1 remains unchanged at 3,369 regions and 67 category-difference pages. The control is diagnostic and was not applied to the published candidate inventory.

Fresh downloads of both official source URLs during this pass match the recorded base and clarification byte hashes and sizes. The current NMC rules index still lists the September 2024 curriculum and October clarification; this lookup is not an exhaustive later-amendment or cohort-applicability review.


Exact source commit `6193fa9d4b136955f7088380ebd280bafde48fdd` is saved in draft PR #382. [CI run 41502715659](https://github.com/mdmoazzam291/Medical_Learning_OS/actions/runs/41502715659) passed core, Chromium and WebKit jobs. This includes 1,568 Node tests and 13 scanner tests. The final follow-up changes documentation and evidence only.

## Empty-region selection diagnostic — 3 November 2026

`ops/nmc/audit_empty_regions.py` audits every one of the 320 v1 empty regions against the exact source PDF. It keeps v1 unchanged and compares its centre-based word selection with positive horizontal word-box intersection within the same vertical midpoint band. This is a selection diagnostic, not OCR, visual blank-cell certification, semantic classification or exclusion approval.

```sh
python3 ops/nmc/audit_empty_regions.py /private/nmc-official.pdf /private/empty-audit.json
```

Two actual-source runs are byte-identical. The checked-in metadata-only `docs/evidence/nmc-empty-region-selection-diagnostic-v1.json` binds all 320 unique region IDs to the existing inventory hash and source hash. It records 132 regions with intersecting words omitted by the centre rule and 188 without column-intersecting words. Row-band counts and hashes preserve evidence of text elsewhere across each band without exporting the source words. All decisions remain null and eligibility flags false. The 132 observations do not resolve the 67 legacy category-difference pages or change competency totals. The 188 observations do not prove visually blank cells or safe exclusions.

The formerly deferred single-boundary/duplicate-only cases and direct CLI version mismatch, actual page-count mismatch and existing-output preservation paths now have dedicated tests. CLI tests use a synthetic PDF and stub engine; actual-source repeatability is verified separately. The Python suite now contains 20 passing tests. These additional tests do not retroactively change the earlier 13-test CI receipt.
