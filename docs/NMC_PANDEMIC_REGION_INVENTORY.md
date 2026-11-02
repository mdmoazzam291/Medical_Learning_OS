# Legacy pandemic module competency-region inventory

3 November 2026. AI source investigation; unreviewed candidate locators, not an exhaustive or approved curriculum.

## Actual evidence

`ops/nmc/pandemic_rows.py` reads the 113-page legacy pandemic booklet with exact SHA-256 `49e2541ca0cfb1c9bc12cb2b7f59d8e3c11c06db7c1e457f747c43f77024e984`. It uses the 17 existing module-opening candidates in `nmc-global-support-review-queue.json`, whose file hash is bound in the output. The final module candidate range ends at page 79; page 80 introduces attached legal annexures, which are outside this primary-table extraction. This boundary is an explicit source-investigation assumption.

All 17 module ranges contain a detected primary competency table: 45 candidate physical regions and 47 displayed level anchors. Module 4.4, official PDF page 65, has a merged body cell containing three level anchors. The source page was rendered and visually inspected; the extractor preserves one physical region and all three anchors without inventing internal row boundaries. Other table pages have not all been visually inspected. The previous estimate of 47 candidate rows from marker counting must not be reused as a physical-row or unique-competency count.

Output `docs/evidence/nmc-pandemic-competency-region-locators-v1.json` stores module/page locators, body-column bounding boxes, word-reconstruction hashes, displayed level labels/anchor boxes and source-bound appearance IDs. It exports no body wording, PDF/rendering, complete source-code list or curriculum table. The 45 distinct body hashes do not establish 45 distinct clinical requirements; wording, nesting and overlaps require separate interpretation.

## Method and reproduce

```sh
python3 ops/nmc/pandemic_rows.py /private/Pandemic-MGT-Module-UG.pdf /private/pandemic-regions.json
python3 -m unittest discover -s ops/nmc -p 'test_*.py' -v
```

Actual extraction requires PyMuPDF 1.26.6. It searches singular/plural competency-addressed headings within candidate module ranges; on those pages, level tokens at x >= 400 are bracketed by nearby long horizontal borders in the body column. Word centres select the reconstructed body text for hashing. This geometry is specific to the hash-pinned unrotated booklet, not a general PDF parser or semantic row definition. Missing boundaries/body, duplicate identical anchors or a module without a located table fail closed. Distinct anchors in the same physical cell are grouped.

Two final runs are byte-identical: 16,857 bytes, SHA-256 `440fc52a161b11594f73eb5192e8ea092e6dc5ecc59119a94a7ce0d83a4a7f0b`. Independent engineering review reproduced the extraction before the additive engine-version metadata was recorded; no actionable findings. All 43 Python tests pass, including five synthetic tests for metadata-only output, source identity, missing boundaries/body, duplicate anchors and merged cells. Repository checks pass (13 services, 250 coupling locations). Fresh hosted CI for this source is not yet verified. PR #383 source 9763d361 now has core/Chromium/WebKit success in run 41523519914; that is separate evidence for its earlier code.

## Remaining scope

Nested subcompetencies, learning objectives and inherited subject-code references are not enumerated by this script. Case examples, teaching/assessment instructions, reading lists and legal annexures are not automatically classified as learner competencies or approved exclusions. Later-edition/cohort applicability, overlap with base CBME/AETCOM and effective unique totals remain unapproved. All eligibility flags remain false; the existing queue stays open. No source decision, canonical/exam mapping, registry ingestion, learner activation or deployment.
