# Canonical content library and AI upload contract

Accepted user requirements: 2026-10-04 (Asia/Kolkata). Read this before importing or classifying any content.

## Identity and exclusive display

One canonical question owns its versions and learning history. Source occurrences are metadata, not question copies. A question with an approved PYQ occurrence belongs only to PYQ collections, never to a coaching Qbank. Repeated years/sessions and different entrance exams remain separate occurrences on that same question. A combined selection counts that question once.

For non-PYQs, choose exactly one display platform: `marrow` > `prepladder` > `dams`; remaining platform IDs sort alphabetically until the owner explicitly supplies another order. This is a provisional Qbank display policy supported by sampled public student reviews (2026-10-04), not a proven clinical-quality ranking. See `PLATFORM_PRIORITY.md`. Do not infer an order for other platforms from advertising or overall app ratings. Preserve suppressed sources for provenance. Original questions have an `original` home. Never infer genuine PYQ provenance from similarity or a platform label.

Exact equivalence requires normalized stem and the same option texts, independent of option order/IDs. Preserve punctuation, numbers, units and negation. A changed correct answer is a conflict, not a new duplicate to silently accept. Similar wording is advisory only; the reviewer explicitly retains distinct clinical tasks or rejects the duplicate. Do not erase historical versions or merge their learner outcomes by guesswork.

## Classification and connected knowledge

Use canonical concept IDs, one primary assessed concept per question and optional secondary/prerequisite/distractor roles. Concepts are not copied across the 19 subject views. Disease, mechanism, finding, drug, organism, investigation and procedure remain distinct concepts when they mean different things.

Classification has independent string-array facets: `subjects`, `systems`, `organs`, `domains`, `tasks`. The 19 controlled subject IDs are anatomy, physiology, biochemistry, pathology, pharmacology, microbiology, forensic-medicine, community-medicine, medicine, surgery, obstetrics-gynaecology, pediatrics, ent, ophthalmology, orthopaedics, dermatology, psychiatry, anaesthesia, radiology. Other facets use stable kebab-case IDs and can express cross-cutting domains instead of forcing everything into an organ. Do not invent mappings from unsupported source text.

Notes have one canonical concept owner. A note can explain questions linked to that concept; explicit `noteQuestionLinks` add `explains`, `contrasts` or `prerequisite` connections and optional exact section labels. Every new note must connect to at least one question in the manifest or existing catalog. Every new question must connect to its primary canonical concept. Related questions are shown in both Notes and Graph views; direct assessment, secondary connection and potential confusion are labeled separately. Similarity is not a proven misconception or medical relationship. Additive reviewed secondary/prerequisite/distractor links bind the exact published question version; only that current version owns its primary assessed concept. A later revision never inherits obsolete clinical links.

## ChatGPT/repository delivery

When the user uploads content in a connected Medical Learning OS chat and identifies PYQ/platform/book origin, the handling agent extracts it into a manifest under `content/inbox/<importId>.json`, validates it, and commits it to this repository. Preserve user declarations and page/edition references. Missing source evidence, answers or category mappings must be surfaced, not invented. Do not commit credentials, patient data or private learner annotations.

The main-branch inbox workflow stages these manifests into the app's admin inbox using the existing server-side database credential. Staging has no publication authority. Other chats/AI services require access to this repository or the authenticated intake endpoint; merely attaching a file in an unrelated chat does not synchronize it.

Manual admin JSON upload and repository delivery use the same manifest and database gate. Retries with identical import IDs/payloads reuse the receipt; a changed payload under the same ID is rejected.

## Manifest v1

Required top-level fields: `schemaVersion: 1`, `importId`, `concepts`, `sources`, `questions`, `notes`, `noteQuestionLinks`.

- Concept: `conceptId`, `label`, `aliases`, `subjectTags`, `classification` (all five facets).
- Source: `sourceId`, `title`, `url` (HTTPS URL or null), `version`, `evidence` (book edition/page or equivalent provenance).
- Question: `questionId`, `stem`, `options` (`optionId`, `text`), `answerOptionId`, `explanation`, `conceptLinks` (`conceptId`, `role`), `sourceIds`, `origins`, `classification`.
- PYQ origin: `kind: pyq`, `examId`, `year`, `session`, `evidence`. These are uploader declarations until the administrator reviews them.
- Platform origin: `kind: platform`, `platformId`, `edition`, `evidence`.
- Note: `noteId`, `conceptId`, `title`, `bodyMarkdown`, `sourceIds`, `provenance` (`kind: ai_generated_original | licensed_adaptation`, `evidence`). Imported external/AI authorship remains in provenance; the authenticated administrator is the accountable curator, not a fabricated source author.
- Note/question link: `noteId`, `questionId`, `relation: explains | contrasts | prerequisite`, `section` (string, empty for whole note).

No uploaded review decisions, published status, learner identity, correctness events or timestamps are accepted. Limit 100 questions, 100 notes, 200 concepts, 200 sources and 500 links per manifest; API limit 1 MiB. Source IDs and canonical IDs must resolve to the manifest or current catalog. Conflicting IDs fail closed. Structured extraction from PDF/image/text is performed by the connected agent; the app does not pretend to perform OCR.

## One admin action

The admin inspects the exact immutable import, resolves each new source's reuse rights with evidence, records an inspection attestation and submits **Review & publish** once. One transaction validates the current catalog, deduplicates, adds source occurrences/classification/links, records Medical/References/Rights receipts and publishes eligible questions/notes. Failure rolls back the entire import. Identical publication retries return the same receipt. A changed manifest digest, conflicting answer, missing source rights or unauthorized actor cannot publish.

This action is genuine administrator judgment, not AI impersonating a human. Original legacy review routes remain unchanged. Staging never approves or publishes. No real medical approval is generated by automated tests.

## Learner views and graph

Use one authenticated published-library projection for Notes and Graph views, subject/system/organ/domain/task filters and exclusive PYQ/platform homes. Return prompt-only questions; answer keys and explanations stay behind accepted-answer/review boundaries. Graph node fills distinguish unattempted/latest incorrect/latest correct. Counts show wrong/total; badges mark repeated wrong answers (at least two), without mastery inference. Concept nodes do not inherit a fabricated mastery colour. Provide a list equivalent and keyboard-accessible node links. Preserve Study, Exams, Vault, Account and existing learning receipts.

## Deferred and destructive scope

Private admin/learner imports are ROADMAP ONLY: separate private sections, question-only graph, no canonical concept connections, learner ownership/erasure/export, no shared publication. Do not implement private imports in this release.

The earlier preservation proposal was superseded by the owner-authorized permanent reset described below. Future destructive resets still require exact scoped inventories; this receipt is not standing authorization to erase newly uploaded content.

## Question keyword search — 2026-10-04

Notes and Graph share free-text prompt/option/concept-label search and a Keyword filter. Question-pattern keywords use the existing `classification.tasks` array: `diagnosis`, `next-best-step`, `definitive-treatment`, `initial-treatment`, `investigation-of-choice`, `gold-standard`, `drug-of-choice`, `most-common`, `mechanism`, `except`, or another stable kebab-case task ID declared during upload. No schema change is needed. Retain any existing clinical task tags. Explicit tags can represent question intent even where wording varies; conservative phrase matching supplements them from stems only. Never derive keywords from answer keys or explanations.

Counts are unique canonical questions within the other active filters, including text search, excluding the Keyword selection itself. Sort descending by count, alphabetical on ties. An exam occurrence repeated in several years never inflates the count. These are library counts, not claims of actual entrance-exam frequency. No frequencies are invented for future uploads.

## Authorized reset supersedes earlier preservation proposal

The owner explicitly chose permanent deletion of the existing shared content and dependent learner history on 2026-10-04. The one-time live database reset is complete: catalog v407 is empty, and content/reviews/intake/media metadata plus dependent attempts/sessions/mock runs/revision/probe evidence were erased. Accounts, admin grants, exam rule configuration and infrastructure remain. Five media objects were removed through the Storage API; temporary maintenance execution is disabled. Pre-reset R2 copies are covered by the bounded backup-erasure workflow. Do not regenerate, restage or restore the erased live catalog from repository test/evaluation fixtures or old backup references. Private imports remain deferred. New content must use the intake/review pipeline.
