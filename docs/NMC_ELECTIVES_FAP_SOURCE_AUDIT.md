# Electives and Family Adoption source audit

3 November 2026. Reproducible AI source investigation, not accepted learner rules or a cohort-applicability determination.

## Electives: preserve the edition difference

The legacy 30-page 2020 Electives booklet quotes the 2019 regulation extract. Exact source SHA-256: a7fb3507e3c76fae9e2be017e4ee589c994c4c05aafaeeed2a9ecd0a22d85cb4. Nine numbered clauses on PDF 10–11 are now located separately from the following curricular-program guidance. They include mixed learner/institutional provisions; the extractor does not classify all nine as learner competencies.

The official revised 2024 base PDF (SHA-256 aa601690b9e92b74f7412973a70969539e93210b41829018f052059bbf5ae23c) has seven Electives bullets located on PDF 37. These are policy/source observations, not seven new medical competencies. Three additional text-span receipts preserve timing evidence:

| Source | Source observation |
|---|---|
| Legacy booklet, PDF 10 | Two months; two blocks of four weeks each |
| Revised 2024 base, PDF 32 | One month; two blocks of 15 days each |

Older duration must not be silently inherited into the revised source. Conversely, these receipts do not settle cohort applicability, later amendments or phase-placement differences across the 2024 narrative and schedule tables. No live learner scheduling or eligibility rule changes.

## Family Adoption: spatial paragraphs and table images

The base PDF 65–67 contains 17 numbered student-target paragraphs: phase counts 6/5/6. Ten separately numbered final-report items continue from PDF 66 to 67; they are not added to the phase-target count or a unique competency denominator.

Page 66 demonstrates why raw text order alone is unsafe: the phase labels are extracted separately from their paragraph runs, and the Phase 3 label appears spatially beside its first paragraph. The source page was rendered and inspected. The extractor validates each page's exact numeric-marker sequence and uses documented source-specific spatial grouping; its phase labels remain candidate source organization, not clinical/semantic acceptance. Paragraph selection excludes the left-hand label and stops before the final-report introduction and following table heading. Footer limits are explicit.

Four embedded table-image appearances on PDF 67–70 are now retained with source page/image bounding boxes, pixel dimensions and image hashes. PDF 68–70 each expose only a folio word through plain-text extraction; they are not blank pages. Images on 67, 68 and 70 were visually inspected during this batch; this is not full visual review of every table cell.

Local Tesseract 5.3.4, English, PSM6 produced candidate OCR receipts with 197/231/288/274 word counts and transcription hashes for those four image appearances. OCR text/images are not exported. Counts/hashes preserve a diagnostic, not interpreted table rows, accurate transcription certification or evidence of unique requirements. OCR results can differ across trained-data versions; the receipt captures the observed local engine and actual source/image hashes, not a portable OCR guarantee. Image hashes refer to bytes exposed by pinned PyMuPDF, not necessarily original PDF object streams. Table rows and OCR interpretation remain unadjudicated.

The FAP logbook-template page 71 and remaining table/certification/assessment obligations still need distinct review. Institutional fields and examples must not become universal learner competencies by default.

## Reproduce and verify

```sh
python3 ops/nmc/electives_fap_audit.py /private/nmc-official.pdf /private/Electives-Module-20-05-2020.pdf /private/electives-fap.json --ocr
python3 -m unittest discover -s ops/nmc -p 'test_*.py' -v
```

Actual extraction uses PyMuPDF 1.26.6; optional local OCR requires Tesseract and English data. Synthetic unit tests require neither PDF engine nor OCR. `docs/evidence/nmc-electives-fap-source-observations-v1.json` contains metadata/hashes only: nine legacy clauses, seven revised bullets, three duration spans, 27 FAP paragraph appearances and four image records.

Two actual runs including OCR and an independent engineering rerun match byte-for-byte: 14,579 bytes, SHA-256 843977966a07169b31b2535b4c7aeaef3f42cf5cede0ab732d632b8630edb6ec. Review independently verified 16 clause/bullet spans, three timing spans, all 27 paragraph hashes and image/OCR receipts; no actionable findings. All 85 NMC Python tests and repository checks pass (13 services/250 coupling locations). Parent PR #394 source 270b7370 has core/Chromium/WebKit success in run 41600594797; hosted CI for this implementation is not yet verified.

All complete-coverage, clinical, learner-activation and source-acceptance gates remain unresolved. No source wording, source PDF, image or OCR transcription is committed. No original queue/frozen-review package change, source decision, canonical/exam mapping, registry activation or deployment.
