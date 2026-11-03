# NMC source-row body and case reconciliation

3 November 2026. Package #1 engineering evidence checkpoint; **not completed source adjudication**.

The frozen identifier-column inventory is now supplemented with source-bound, full-width physical text-band observations for all 263 selected defining-table pages and all 3,369 existing regions. The CLI first rebuilds the original inventory from the pinned 467-page source and its exact geometry manifest; it refuses a mismatch before building this companion audit.

| Observation | Count |
|---|---:|
| Identifier-bearing physical bands | 2,634 |
| Existing header-classified bands | 415 |
| Empty identifier column with text elsewhere | 271 |
| Bands with no extracted words | 49 |
| Total physical bands | 3,369 |
| Words crossing a band boundary | 114 |
| Words outside all selected bands | 266 |

Every band retains its original region ID, body hash, word counts and pending observation status. Page receipts bind full word geometry and outside-band words by digest. Midpoint assignment counts each word once; a word straddling a boundary is flagged rather than duplicated. This is rotation-adjusted PDF plain text, with no image OCR. Full-width bands are physical observations, not certified table-row boundaries, logical competencies or semantic continuations. An empty code cell can contain important text; the 271 bands are not 271 additional requirements.

A separate rotation-adjusted source check found the outside-band words comprise 263 numeric tokens and three next-section heading tokens on page 456. They remain in the page receipts. No source text, PDF, image, OCR or bulk identifier corpus is committed.

## Case partition and evidence

Sixteen of the existing 22 cases concern source rows, identifiers or count reconciliation. All sixteen now bind to current row-band page receipts. Seven malformed/wrapped identifier cases additionally bind to the exact affected region/body; a valid but unrelated row on the same page cannot substitute for the target. Original non-defining evidence pages remain explicit instead of being falsely presented as scanned defining tables.

The classifications preserve distinctions between punctuation/wrapping observations, contextual prefix proposals, missing-suffix/topic inferences, repeated topic segments, source numbering gaps, publisher count conflicts and contents/defining-prefix conflicts. No proposed identity is applied. In particular, missing suffix/topic digits in MI/AS and the malformed OR cell remain proposals; GM/SU gaps do not become invented or deleted requirements. Published PE/GM/OG/OP/SU discrepancies are preserved rather than reconciled by arbitrary trimming or additions.

Six other cases remain tracked under global/supplementary interpretation or amendment applicability: institutional-fragment, global-granularity, aetcom-class, aetcom-similarity, aetcom-partial and amendment-effects. They have not been discarded. The original 22-case packet and 1,031 page dispositions are unchanged; decisions remain null.

## Reproduce

```sh
python3 -m unittest discover -s ops/nmc -p 'test_*.py' -q
python3 ops/nmc/row_body_audit.py /private/nmc-official.pdf --verify docs/evidence/nmc-full-row-band-observations-v1.json --case-bindings docs/evidence/nmc-source-row-case-bindings-v1.json
```

Pinned source hash: `aa601690b9e92b74f7412973a70969539e93210b41829018f052059bbf5ae23c`; PyMuPDF 1.26.6 required. The verifier rebuilds all original regions, page receipts and full-band evidence from the actual source, then checks the case partition and exact hashes. CI uses synthetic geometry and committed metadata; it does not download protected sources or replace actual-source verification.

## Remaining to close package #1

Inspect and decide the logical role of uncoded text and boundary crossings; confirm row continuations and exclusions without losing provenance; resolve each of the sixteen identity/count interpretations through evidence-bound review or explicit primary-source clarification. The 415 header-classified bands are also observations, not reviewed exclusions. Qualified acceptance and any official-source clarification remain distinct from AI engineering investigation.

Package #1 and the overall twelve-package register remain open. No effective unique competency denominator, source no-omission statement, normalized canonical identity, clinical/rights approval or learner activation follows from this audit.
