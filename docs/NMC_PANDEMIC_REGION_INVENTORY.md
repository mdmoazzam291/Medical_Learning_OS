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

## Explicit nested-item and reference scan — 3 November 2026

`ops/nmc/pandemic_nested.py` now searches all 17 candidate module ranges (69 pages, PDF 11–79) for explicitly headed subcompetencies and learning objectives. It locates eight appearances: Module 3.2 has one unnumbered subcompetency and five numbered objectives on pages 45–46; Module 3.3 has two numbered subcompetencies on page 50. These are source-nested appearances, not eight additional unique competencies or approved parent-child relations.

`docs/evidence/nmc-pandemic-explicit-nested-locators-v1.json` stores page-text digests, Unicode character spans within PyMuPDF plain page text, body hashes and source-bound appearance IDs. Leading numeric page folios are replaced with equal-length whitespace while preserving newlines; pages join with a single newline. Offsets refer to the original page strings, not PDF byte offsets or rendered coordinates. Body hashes follow this explicit reconstruction method, not a claim of original source bytes. Section search stops at the next explicit nested heading or teaching/case/assessment/resource heading; numbered sequences must start at one and be contiguous. Items lacking those recognized headings remain outside this method.

A conservative uppercase subject-code regex found zero standard dotted references in these 69 pages. This does not establish absence of differently formatted references or semantic relationships. Subject overlap and inherited mappings remain unapproved; no zero-obligation or full-objective-enumeration claim is made. The earlier statement that nested objectives were wholly unenumerated is superseded only for these explicitly detected sections. Other nested requirements and objectives may remain.

```sh
python3 ops/nmc/pandemic_nested.py /private/Pandemic-MGT-Module-UG.pdf /private/nested-items.json
```

Two actual-source runs and independent engineering rerun are byte-identical: 11,576 bytes, SHA-256 `1101579a2fb261324e5177790ee5d08c84c4bc7386e4113c350d2e46a240735e`. Reviewer independently reconstructed all eight body hashes from the recorded offsets after folio normalization and verified bounds. All 48 NMC tests and repository checks pass. Output contains metadata and hashes only. Fresh hosted CI for this implementation is not yet verified; no source approval, eligibility, learner runtime, frozen package or deployment change.
