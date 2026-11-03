# NMC support scope and cohort reconciliation

Engineering review dated 3 November 2026. The remaining #2 investigation and #3 source/version preflight are implemented. Neither work package is qualified acceptance or production activation.

## Support scope (#2)

Five independent full-document reviews cover 10 pinned supplements and 560 pages. The metadata-only proposal packet records 474 text-passage locators and 211 raster locators. Raster entries include 170 Alignment locators, four Assessment diagram objectives and 37 parent/foreword image locators. Counts are appearances and proposals, not a unique competency denominator.

Added scope includes Foundation sample/moderator objectives, ECE examples, Skills performance/certification blocks, illustrative Electives objectives, six nested Pandemic outcomes, and Online permission guidance. The earlier Online assessment-stage description is corrected separately without rewriting frozen evidence identifiers. All page judgments and candidates remain unapproved.

## Source/version investigation (#3)

The applicability packet pins 31 official source URLs, 30 distinct PDF hashes and 153 render/OCR receipts. This expands the screened 24 distinct notice URLs with legacy curriculum and 2023 guideline sources. Every textless notice/rules page is covered by a receipt; this is not a full clinical transcription audit of legacy volumes.

Read-only preflight separates source edition, programme, purpose, admission cohort, policy cycle and document state. Draft and withdrawn documents cannot become effective candidates. Unknown scope remains unresolved. A matching scope never produces admission eligibility, regulatory enforcement or learner activation. Historical prefixes are keyed by edition and fingerprint; no global subject aliases are introduced.

The October 2023 notice concerns non-retrospective application, not wholesale repeal. The August 2024 withdrawn version is distinguished from the revised September source. Current-year titles do not imply automatic expiry. Institutional-governance and admission/accessibility notices do not replace the competency corpus. These are source-backed proposals pending qualified interpretation.

## Validation and remaining acceptance

141 NMC tests pass. Both actual-source verification commands pass: all 560 page hashes, 474 text spans and 211 raster locators; 31 source URLs/30 PDF hashes and 153 OCR receipts. Raster verification checks image/render hashes, crop hashes and the actual pixel-to-PDF coordinate transform.

Still required: qualified semantic/clinical decisions, source-version and cohort acceptance, rights review, and activation approval. Existing identity/count conflicts and the 12-package acceptance register remain open; no objective, mapping or learner content is activated by these packets. This bounded investigation does not certify exhaustive future notices or that the entire NMC foundation is complete.

Reproduce with `python3 -m unittest discover -s ops/nmc -p 'test_*.py'`, `python3 ops/nmc/support_scope_review.py <supplement-directory> --verify docs/evidence/nmc-full-support-scope-proposals-v1.json`, and `python3 ops/nmc/source_applicability.py <freshness-source-directory>`. Source PDFs and transient OCR/render files stay outside Git.
