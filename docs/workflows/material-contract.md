> Portable reference snapshot: 2026-10-12. Read alongside the adjacent workflow and current live Drive governance. Actual app compatibility is governed by ../CONTENT_LIBRARY_CONTRACT.md and ../MATERIAL_RELEASE_ADAPTER.md.

# Material contract

## Folder routing
| Folder | Contents |
|---|---|
| 01_Inbox | Awaiting classification or extraction |
| 02_Originals/Content/source | Unchanged notes, textbook extracts, images, PDFs |
| 02_Originals/PYQ/exam/year-or-unknown | Unchanged source papers or recalled-question uploads |
| 02_Originals/QBank/provider-or-unknown | Unchanged platform/user question uploads |
| 03_Canonical/Concepts/concept_id | One integrated concept and its versioned enrichment |
| 03_Canonical/Questions/question_id | One canonical question with linked variants |
| 04_Exam_Views/exam/year-or-unknown | Occurrence manifests pointing to question IDs; no duplicated question bodies |
| 05_Faculty_Analysis/source_id | Links, acquired text, atomic claims, and analysis reports |
| 06_Review/intake_id | OCR gaps, key disputes, provenance/rights gaps, rule proposals |
| 07_Release/release_id | Validated exports and release manifest |
| 08_Archive/run_id | Superseded versions and rollback snapshots |

Never file one concept physically under multiple subjects. Use tags and index references. One source document may yield multiple content types. Retain its original once and route derived records independently. Subfolders are lazy-created.

## Identity and provenance
Use stable opaque IDs rather than titles as identity. Retain original spelling as alias; normalize search text separately. Never strip clinically meaningful negations, doses, age, timing, units, or option differences when matching. SHA-256 confirms byte duplicates only, not semantic duplicates.

Maintain these record types:
- Source: source_id, original Drive ID/URL, original filename, hash/status, creator/provider, source type, publication/edition/access dates, rights status, extraction coverage and exact locators.
- Concept: concept_id, preferred label, aliases, subject/system tags, related concept IDs, prerequisite IDs, version, claim evidence, clinical jurisdiction, review status.
- Question: question_id, stem, labeled options, image source IDs, source appearances, objective, concept IDs, intent tags, source answer, verified answer with evidence, historical keys, explanations, variant_of, statuses, version.
- Occurrence: occurrence_id, question_id, exam, year, session/form if known, locator, provenance class, evidence source_id, historical key. Use unknown rather than guessing.
- Source appearance: question_id, source_id, provider, locator, rights, preferred display provenance.
- Intake: intake_id, sources, rule version, extraction status, affected records, writes, conflicts, resumable step.
- Claim: claim_id, target IDs, statement, exact locator, evidence source, validation, date/scope, status.
- Change: change_id, before/after versions, source claim IDs, validator type, applied IDs, rollback ID.

## Duplicate decisions
1. Verified identical exam question across years: one question, multiple occurrences.
2. Same question across NEET-PG and INI-CET with proven appearances: one question, both exam views; never infer an exam from resemblance.
3. Verified PYQ also in a platform bank: canonical PYQ presentation, platform appearance retained.
4. Same subject but materially different task, option, key, image, or scenario: variants or distinct questions.
5. Uncertain near match: candidate record in Review, no automatic destructive merge.
6. Pure QBank duplicates: one active canonical item; choose display provenance using an evidence-backed project preference policy. If no policy exists, use best documented accuracy/completeness/rights, and record this fallback.
7. Recalled or faculty-attributed PYQ: label recall/unverified occurrence until official or adequate primary provenance establishes identity/year.
8. Retired duplicate IDs redirect to the survivor. Keep histories/mappings unless a separate explicit deletion task authorizes removing them.

## Enrichment gates
Each question should answer: what is tested, why the answer fits, why alternatives fail in this context, what clue discriminates, what misconception caused an error, and how the concept transfers. Do not add filler or all 19 subjects merely to increase coverage. Link only relevant disciplines. Derive independent new practice variants and label them generated.

Track gates individually as passed, failed, pending, or not_applicable with evidence:
- Extraction and stem/options complete.
- Medical factual support current for specified context.
- Answer uniquely defensible or explicit multi-answer format.
- Source and provenance classification supported.
- Options parallel, plausible, non-overlapping; no inadvertent answer cues.
- Referenced image exists, legible, accurately associated, and justified.
- Rights permit the intended use.
- Deduplication and required concept/occurrence links consistent.
- Learning explanation useful, concise, and compatible with source facts.

Separate draft_ready, private_study_ready, and publication_ready. Unknown licensing blocks publication, not preservation of a private provenance record. A human-reviewed flag requires an actual identified human review; automated checks may pass without being called human review.

## Keyword counts and priorities
Maintain controlled intent tags and source-phrase aliases. Compute question frequency using distinct question IDs that pass the selected eligibility filter, not raw upload count or duplicate appearances. Compute exam occurrence frequency separately. Counts have a scope, time, and denominator. Frequency in an incomplete corpus is not probability of a future exam question. Preserve custom uploaded keywords and validate proposed mappings.

## Updates and downstream use
Use one writer at a time or queue updates. Read current IDs/versions before an in-place replacement. On an uncertain write result, verify by metadata and content/manifest before retrying. Produce changed-ID lists for graph, QBank, NeuralVault, Exam DNA, and Study Now imports; do not alter learner mastery or attempt history because content changed. Exports are material artifacts, not automatically deployed app changes.

## Durable release package — mandatory before handoff
Whenever modified, enriched, corrected, reorganized, or deduplicated content becomes eligible for an app/site ingestion handoff, preserve its final state in Drive under 07_Release/<release_id>. This applies to manual, faculty-driven, and automated edits, regardless of the intended repository, API, database, or other import route. Keep the canonical working records and unchanged originals separately. No eligible changes means reuse the existing verified release.

Use portable, UTF-8, open formats rather than a platform-only document or database dump:
- content/<concept_id>-v<record_version>.md: readable integrated notes, source references, and relevant links.
- questions/<question_id>-v<record_version>.md: readable question, labeled options, answer/key distinctions, explanation, tags, provenance, and exam/year appearances. Use shared IDs rather than duplicating a question body per PYQ year.
- records/concepts.jsonl, questions.jsonl, occurrences.jsonl, sources.jsonl, and relations.jsonl: structured canonical records for machine ingestion. Include only applicable datasets; JSONL means one complete JSON object per line. Structured question facts are authoritative; render their Markdown from the same records and check agreement. Note prose may remain authoritative in Markdown with an explicit content-file reference in its structured record.
- assets/: required authorized images/media with relative paths and stable IDs, or a documented portable asset manifest. Do not describe external-only URLs as a self-contained backup. Missing required assets block ingestion readiness; preserve the draft and record the gap.
- manifest.json: release_id, UTC time, schema_version, included record IDs/versions, dataset counts, source/rule versions, prior release, file paths and SHA-256 checksums, asset requirements, eligibility/rights scope, and actual validation status. Record verified Drive IDs/URLs in a companion save receipt and the project index to avoid self-referential checksum changes.
- schema.json: the actual schema definitions or a pinned, retrievable schema reference, encoding, required fields, nullable fields, relationship semantics, and migration notes where relevant. No claim that a format alone guarantees compatibility with future technology.
- changes.jsonl and validation.md: created/changed/retired IDs, redirects, before/after versions, applied claims/rules, unresolved exclusions, performed checks, and rollback instructions. Include a concise INGESTION.md explaining dataset order, asset resolution, schema/adapter requirements, and the intended import path if known.

Use opaque stable record IDs for identity; descriptive slugs are optional labels. Never use personal data, credentials, expiring signed URLs, or secrets in release filenames or import instructions. Keep licensing/provenance and historical keys attached to reusable copies.

Create an immutable snapshot per new release. Never overwrite an older released package when another edit occurs. Maintain the latest verified release ID in the project index, distinguishing latest portable, app-compatible, and actually ingested releases. Do not regenerate all unchanged records; a delta package may reference an immutable base, provided the full base chain and assets are retained and the material can be reconstructed.

Before handoff, validate JSONL parsing, declared schema, unique IDs, referential integrity, relative asset references, counts, checksums, and Markdown/structured answer agreement. Verify all Drive writes by metadata and content/checksum readback where required. If saving fails or the outcome is uncertain, retain working files, reconcile the write, and mark release persistence pending; do not declare the handoff complete.

Label the package portable_export_ready after format and preservation checks. Label it app_ingestion_ready only after checking the actual target app's schema/adapter and a non-mutating import dry run, where supported. Unknown target compatibility remains compatibility_pending. Neither label means ingestion occurred. Save before separately authorized ingestion; afterward, append an ingestion receipt containing the actual target, release ID, time, importer version, counts, failures, and deployment/import reference if available. Never infer successful ingestion from saving files or updating a repository alone.
