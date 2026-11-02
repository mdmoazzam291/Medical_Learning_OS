# Reproducible NMC defining-column region inventory

Status: unreviewed engineering evidence; not a no-omission, clinical, rights or exam-scope approval.

## Source and scope

The local input is the official revised12September2024 PDF from https://nmc.org.in/rules-regulation-nmc/33/file:467pages, SHA256 `aa601690b9e92b74f7412973a70969539e93210b41829018f052059bbf5ae23c`. Its10October clarification is separately available at https://nmc.org.in/rules-regulation-nmc/34/file and remains part of the existing amendment review. The new scanner uses only the263 defining-table pages and candidate first-column bounds in `docs/evidence/nmc-codecell-page-receipts.json`. It does not independently establish that this page scope is exhaustive.

The former detailed geometry extraction was transient. `ops/nmc/codecell_inventory.py` now specifies the actual extraction method and persists every newly extracted candidate region as source-bound coordinates, classification and digests. `docs/evidence/nmc-row-region-inventory-v1.json` contains no raw source words, full code list, source descriptions, tables or PDF bytes. Physical region IDs are not canonical medical concepts or approved competency identities.

## Repeat the actual extraction

Use a local copy with the exact hash above and PyMuPDF1.26.6. The optional PDF dependency is not installed into the app or required for synthetic unit tests.

```sh
python3 -m pip install PyMuPDF==1.26.6
python3 ops/nmc/codecell_inventory.py /private/nmc-official.pdf /private/regions.json
python3 -m unittest discover -s ops/nmc -p 'test_*.py' -v
```

The scanner verifies source bytes, selected manifest pages/column order and actual467-page count. It rotates word/vector rectangles into displayed coordinates, clusters horizontal first-column boundaries within1point, assigns words by first-column centre and vertical midpoint, and reconstructs lines within5points before hashing. This is a versioned candidate algorithm, not recognition of all true physical/clinical rows. An empty region means no words selected by this method, not an independently inspected blank cell; header also includes unclassified regions and is not an approved exclusion. Wrapped/malformed cells remain nonstandard; footnote-bearing tokens and repeated appearances are not silently corrected or deduplicated. It writes an exclusive new JSON file and has no network, DB, Auth, ingestion or deployment action.

Same source/method/manifest runs reproduced byte-identical output twice. A separate AI engineering reviewer rebuilt the object directly from the PDF and matched it exactly. That review is not the qualified independent source adjudication required by the existing22-case packet.

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

Every selected page matches the historical identifier-candidate count. This is count parity, not proof of identical code sets, correct classifications or complete competencies. Category counts differ on67pages. Ten pages have one fewer total boundary region:162,187,206,215,269,329,403,427,444,452. Preserve this uncertainty; do not overwrite the old receipts or choose the method that makes a headline total match. The remaining differences involve empty/header classification and require source review. Earlier continuation proposals do not approve these new boundaries.

Representative official pages108/169/172 were rendered and inspected locally for ordinary table boundaries, a prefixless code and a wrapped code. The images and source prose were not committed. This is not full-page-by-page review of263pages or1,031supporting-source pages.

The published2,781summary, PE253/406 discrepancy, other subject differences, supplementary/global overlap, later amendments and22pending source decisions remain open. The eight application proposals still have zero source/rights approvals and no canonical/exam mappings. The new region metadata is not imported into them. All four approval/activation flags remain false; learner coverage stays unknown.

## Validation limits

Thirteen synthetic Python tests cover metadata-only output, physical identity/source changes, malformed/wrapped cells, empty/header retention, declared column ordering, strict page/hash/count/coordinate validation, input-order invariance and integer/float geometry identity. Current Node suite1568/check/build pass. CI runs the pure Python tests without fetching/rehosting NMC PDFs; the actual-source repeat is local evidence.

Optional follow-up tests remain for single-boundary/duplicate-only cases and direct CLI version mismatch, page mismatch and exclusive-output paths. Do not imply those dedicated negative scenarios ran. Engineering reproducibility is not source, clinical, rights, exam or production acceptance.
