# NMC CBME 2024 coded-competency completeness audit

**Status: NOT COMPLETE.** Parent PR #343 shares the canonical 19-subject navigation blueprint, parent #344 contains 8 *unverified* General Medicine code references and NMC copyright gates. This increment adds an **explicit 2,781-code subject-wise audit target and an offline, metadata-only document inventory tool**. It does not claim verified full source enumeration, exam coverage or mastery.

## Grounded source denominator (September 12, 2024 revised curriculum)

Source: [University College of Medical Sciences hosted revised September 2024 compilation](https://medicaleducationucms.weebly.com/cbme-implementation.html), [referenced PDF](https://medicaleducationucms.weebly.com/uploads/1/2/6/3/126364586/document__8__merged.pdf), the merged PDF's three printed subject-totals tables in Volume II introductory pages **17–20** (PDF viewer p.257–259 approximately, one-based). They show **1,139** coded subject competencies in Volume I, **1,132** in Volume II and **510** in Volume III; **2,781** total, **19 subject categories**. The origin is a university-hosted *searchable-text mirror*, **not a byte-verified official master document**; total counts are recorded as published and require primary-file parity and final manual verification. The 12 September 2024 NMC notice confirms supersession for MBBS 2024–25 entrants and beyond; do not confuse the withdrawn 31 August curriculum. The 10 October clarification may affect edition-specific scope and must be assessed.

Source counts define only the **numbered subject-specific competencies** in Volumes I–III. They are **not evidence** that global IMG competencies, AETCOM modules, certifiable skills, ECE, foundation course and curricular appendices have been exhaustively indexed. These remain explicit blockers even if the 2,781 subject rows are ever reconciled. Do not equate NMC undergraduate curriculum with a comprehensive NEET-PG or INI-CET official topic list.

## Quantitative status

19 subjects, 2,781 **published expected numbered subject competency records**.
Existing local proposal ledger: **8** code-reference rows, all unverified, all General Medicine. **At least 2,773 absent records**. Not even the 8 are verified against an official PDF visual review, or mapped to an accepted canonical medical concept. No official syllabus-completeness %, predicted exam rank or learner readiness may be emitted.

## Implementation

- \`data/nmc-2024-competency-counts.json\`: 19 source-published subject counts in 3 volumes with original NMC document references and rights mode \`citation_only\`. Subject IDs reuse \`src/domain/subject-index.js\` (one taxonomy). The printed legend prefix is provisional; e.g. dermatology table uses \`DE\` whereas page-level records sometimes display \`DR\`; the scanner must surface such mismatches, not silently assign a different code.
- \`src/domain/nmc-competency-coverage.js\`: reconciles source totals, existing 8 unverified records and optional extracted local PDF metadata scan. Strict checks reject fabricated approval/rights, changed count targets, invalid scans. Reports honest unknowns and missing minimum counts. The report **always fails closed** for independent exact-source proof and broader curricular exhaustiveness.
- \`src/domain/nmc-code-extraction.js\`: transient, metadata-only code parser (ID and page hits only). False positive or false negative extraction is possible. This is **not OCR**, not primary document verification, not medical validation, and not copying NMC competency text.
- \`scripts/nmc-code-inventory.js\`: **local only** source PDF → code/page index via \`pdftotext -layout\` (requires poppler) + SHA-256 of **actual input PDF bytes**. The PDF and raw text are not written to GitHub; outputs include only IDs/pages, digest, unverified scan flag. Never commit raw document or extracted NMC wording to the repo.
- \`scripts/nmc-competency-coverage.js\`: read-only JSON audit, source target versus recorded code count and optional local scan. No writes to Supabase, study models or learner surfaces.
- \`tests/nmc-competency-coverage.test.js\`: arithmetic/source-map/negative cases and partial-scan honesty.

### Offline source-check procedure (after obtaining the authentic revised PDF)

\`\`\`bash
node scripts/nmc-competency-coverage.js
node scripts/nmc-code-inventory.js /private/nmc-cbme-revised-sept2024.pdf /private/nmc-2024-id-pages-unverified.json
node scripts/nmc-competency-coverage.js /private/nmc-2024-id-pages-unverified.json
\`\`\`

**Do not commit the PDF or its extracted source prose to public/private branches.** Keep PDF byte provenance local or in appropriately restricted, rights-reviewed storage, never a Cloudflare static Pages bundle. Compare each subject's *unique* extracted codes against published subject count, inspect unexpected prefixes, split/join artifacts and duplicate appearances; independently check every source table page against the metadata. Record the exact PDF SHA-256 and official edition/corrigenda lineage. Export only code/page metadata after rights review. The browser learner API must never receive the raw source.

A machine count match is not sufficient. A credible zero-omission statement also needs (a) independently verified code manifest from **every actual source page**, (b) reconciliation of all 19 subject codes, volumes and page boundaries, (c) resolution of the dermatology legend mismatch and any other uncertain/duplicated code, (d) separate audit of general/AETCOM/supplemental competencies, and (e) named independent review and unchanged digests. Each exam pathway then requires separate exam-scope evidence; NEET-PG and INI-CET must not silently inherit NMC undergraduate requirements as an official exam-topic list.

## Copyright policy

NMC's [UG Curriculum page](https://www.nmc.org.in/information-desk/for-colleges/ug-curriculum/1000/) explicitly says curriculum content is copyright-protected. MLOS uses **\`citation_only\`** rights state, source links/versions, code identifiers, page anchors and independently written short review notes. Neither a freely available PDF nor its SHA-256 gives permission to reproduce, rehost, adapt or commercially redistribute the NMC descriptions or complete tables. Original independently authored concept teaching still requires existing clinical and rights review before publishing.

## Priority

**Build now:** this denominator/omission audit; locate and independently confirm authoritative 2024 source bytes; local metadata-only scanner and test against all 19 subjects.

**Then:** complete code IDs/page anchors and an explicit subject-by-subject missing-code register; independent source inspection and snapshot versioning; topic/competency-to-canonical graph binding after exact identity acceptance.

**Later:** two separately reviewed NEET-PG/INI-CET objective-map overlays, Exam DNA historical inference and validated learner recommendations. Do not merge parent draft PRs or auto-approve.
