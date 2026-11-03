# FAP image-table fragments and logbook labels

3 November 2026. Source observations only; not accepted clinical table interpretation.

## Candidate raster-grid fragments

`ops/nmc/fap_table_cells.py` binds the official 467-page base PDF and the prior Electives/FAP image receipt. It verifies each embedded image hash on PDF 67–70 before processing. Seven vertical grid-rule clusters delimit the six source columns observed in the first table header: year/visits, competency, objectives, teaching methods, assessment methods and teaching hours. Those column roles are source-header observations, not mappings into the learning engine.

Per-column horizontal rules yield 62 candidate cell fragments, including six header fragments. Six fragments end at an image boundary without a detected bottom rule. They are explicitly open fragments; no logical row continuation is inferred or joined across images. Even fragments with visible borders are not automatically distinct requirements. Header fragments are retained rather than silently discarded as approved exclusions.

The geometry method uses grayscale threshold 225, vertical dark-pixel coverage greater than 75%, horizontal coverage greater than 85%, and minimum retained band height eight pixels. Thin border clusters are averaged; a narrow leading image margin does not create a fake cell. The method is specific to these pinned source images, not an exhaustive semantic table parser. Thresholds and detected grid positions are stored in the receipt.

Each fragment retains its pixel box, source-image hash, grayscale crop-pixel hash/dimensions, observed column and edge flags. Its physical identity is computed before OCR and therefore does not depend on transcription. Local English Tesseract PSM6 stores only candidate OCR hashes and word counts; no image, crop or transcription is exported. OCR accuracy and logical/clinical interpretation remain unapproved. Engine versions are recorded; trained-data variation can alter OCR, so the hashes record observed local reproducibility rather than a portable transcription guarantee.

## Blank logbook template

Page 71 has 12 blank labels located by exact page-text character spans/hashes: institutional/learner identifiers, community/family details, activity dates and mentor-related labels. The source's institute-modification instruction is separately span-bound. These are blank source-template labels, not 12 compulsory app fields. No household/student names or other actual personal data are collected, and no data-entry form or storage schema is implemented. Actual evidence/logbook obligations still require source-role and applicability review.

## Reproduce and evidence

```sh
python3 ops/nmc/fap_table_cells.py /private/nmc-official.pdf /private/fap-cells.json
python3 -m unittest discover -s ops/nmc -p 'test_*.py' -v
```

Actual extraction uses PyMuPDF 1.26.6, Pillow 12.3.0 and local Tesseract 5.3.4/English. Pure unit tests need none of the PDF/image/OCR engines. Metadata receipt: `docs/evidence/nmc-fap-table-fragments-logbook-v1.json`.

Two actual runs and independent source/OCR rebuild are byte-identical: 46,452 bytes, SHA-256 a8f06cc82542fc23c78b71457199042c3894a703b888724270032d6bea5501a4. Review independently verified all 62 pixel crops, source-image hashes, dimensions and OCR-independent identities; all 12 label spans and the instruction also reconstruct. All 89 NMC tests and repository checks pass; no actionable findings. Parent PR #395 source c4617420 has core/Chromium/WebKit success in run 41607697923; fresh hosted CI for this implementation is not yet verified.

Source-image presence and fragment enumeration do not close full FAP requirement coverage. Continuations, clinical/source-role interpretation, logbook obligations, source overlap, cohort applicability and release remain unresolved. Existing frozen source queue/review package and learner runtime remain unchanged; no source approval, universal additions, canonical/exam mapping, activation or deployment.
