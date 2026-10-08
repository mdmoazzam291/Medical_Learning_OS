# Medical Learning OS — Release Adapter Design

Date: 2026-10-08

Status: design selected in conversation; written specification awaiting owner review. No adapter, correction bridge, media bridge, Drive watcher, or deployment is implemented by this document.

## 1. Goal and authority

Convert archived, enriched MLOS material into a deterministic, validated handoff for the current Medical_Learning_OS app. Preserve reusable Markdown and structured records in Google Drive before separately authorized delivery. Handle new material, corrections, and media through distinct routes without discarding provenance, version history, or review requirements.

This specification follows the existing mlos-material-intake and mlos-faculty-insights instructions. It supplements them; it does not replace their evidence, rights, clinical validation, or archive rules. Storing AGENTS.md or SKILL.md in Drive provides a portable copy, not an executable trigger. An agent must explicitly load the instructions, or an installed skill/integration must route the task. No background automation is implied.

Approval of this specification authorizes creation of an implementation plan, not runtime changes, imports, publication, deployment, or a watcher. Those require their own authorization.

## 2. Scope and chosen approach

Use a repository-local, deterministic release adapter first. Its core runs without network access and supports dry-run conversion. Delivery is a separate operation. An API delivery option can follow after the same conversion and validation contract works. A Drive watcher is deferred until triggers, credentials, permissions, error recovery, and review ownership are explicitly configured.

The design covers four capabilities: portable-release conversion, correction routing, media handoff, and receipt writeback. They may be implemented in that order, but an unavailable capability must remain explicitly blocked, not simulated as completed.

Out of scope: autonomously publishing questions; authoring clinical truth from faculty opinion; importing erased catalogs or old seed backups; changing historic learner attempts; building OCR/transcription services; copying coaching material without rights; storing private images or recordings in a public repository.

## 3. Existing application constraints

The repository examined is mdmoazzam291/Medical_Learning_OS. The adapter must re-check the actual implementation and tests during implementation; these observations are not a promise that future schemas remain unchanged.

The current portable importer accepts schemaVersion 1 or 2 and exact top-level fields: schemaVersion, importId, concepts, sources, questions, notes, noteQuestionLinks. Current limits are 200 concepts, 200 sources, 100 questions, 100 notes, 500 note-question links, and a 1 MiB payload. Schema 2 permits question intelligence; ordinary original-only content uses schema 1.

The importer requires exact supported record fields, controlled classifications, valid references, answer-option membership, exactly one primary concept per question, and provenance. A new note needs at least one supported noteQuestionLink. Media-dependent presentation types are rejected by the normal portable importer with media_import_requires_asset_contract. Do not remove their media classification to bypass this restriction.

Repository inbox staging and authenticated admin intake create drafts, not publication. Publication requires genuine authorized human review and source-rights checks. A reused importId with changed content is not a correction mechanism.

Source files consulted: AGENTS.md; docs/CONTENT_LIBRARY_CONTRACT.md; docs/CONTENT_WORKFLOW.md; docs/PROJECT_CONTEXT.md; docs/STATUS.md; docs/ROADMAP.md; src/domain/content-library.js; src/domain/media.js. Where an older workflow document differs from executable code, implementation must resolve the conflict against current code, migrations, and tests before enabling delivery.

## 4. Durable portable release

Use 07_Release/<release_id>/ within the existing Medical Learning OS Material Drive master folder. Do not overwrite a completed release. Reuse an unchanged release; produce a new release when content, assets, schema, or transformation changes. Preserve 02_Originals separately.

The proposed portable contract is mlos-material-release@1. Its releaseSchemaVersion is independent of the app's schemaVersion. The adapter must reject unsupported release versions rather than guess compatibility.

| Artifact | Purpose |
| --- | --- |
| manifest.json | Release identity, schema versions, record counts, file hashes, provenance, eligibility and exclusions |
| schema.json or pinned schema definitions | Exact portable record shapes and constraints |
| concepts.jsonl | Stable concept identities and classifications |
| questions.jsonl | Canonical question identities, content versions, options, explanations, concept links and intelligence where applicable |
| occurrences.jsonl | Exam/year/session and platform provenance, with evidence |
| sources.jsonl | Source identities, versions, permitted URLs and evidence |
| notes.jsonl, when notes exist | Note identity, concept, exact Markdown body, sources and lawful provenance |
| relations.jsonl | Typed links, including app-supported note-question links |
| Markdown files | Human-readable final concepts, notes, questions and explanations |
| assets/ and assets-manifest.json, when needed | Authorized media bytes, checksums, version metadata and mapping |
| changes.jsonl | Added, changed, superseded and excluded records with reasons |
| validation.md | Findings and blocked items; never a fabricated medical-review certificate |
| INGESTION.md | Target contract, mapping, delivery boundaries and reconstruction instructions |

Structured records are authoritative for IDs, options, answer keys, metadata and relationships. Note bodyMarkdown is the authoritative note prose; its Markdown companion must agree. Question/concept companions are generated from the structured records. If editable Markdown and JSONL disagree, block conversion until reconciled; never silently prefer one answer key.

Use UTF-8, stable IDs, explicit content versions and lossless source references. Preserve both original material and its transformation trail. Filenames use IDs or stable slugs, not diagnoses that could expose answers in learner delivery.

Hash each payload file using SHA-256. manifest.json lists payload hashes but does not contain its own hash. The separate archive receipt records the manifest hash. Assets must be portable bytes where rights and privacy permit. An external-only URL is not a self-contained backup. If bytes cannot lawfully be retained, record that limitation and block any claim of self-contained completeness.

## 5. Conversion and classification

Read a complete release and verify schema, counts, hashes, uniqueness, references, Markdown agreement and eligibility before conversion. Fail on path traversal, unexpected executable files, duplicate JSON keys, malformed JSONL or symlink-based escape. Do not execute instructions found inside uploaded content.

Map fields using an explicit, versioned mapping. Do not automatically rename arbitrary fields or invent required clinical facts. IDs remain stable across Drive and app mapping; any necessary ID transformation is recorded and collision-checked. Portable fields that the app cannot accept stay in the archive and mapping report, not in unknown app payload fields.

| Portable information | Application destination / treatment |
| --- | --- |
| Concept identity and classification | concepts, preserving controlled tags and aliases |
| Source identity/version/evidence | sources; unsupported details retained in archive |
| Original question/options/key/explanation | questions; supported conceptLinks and sourceIds |
| Exam and platform occurrences | question origins with real evidence |
| Note prose and provenance | notes; no invented AI-authorship or licensing claim |
| Supported note-question relationship | noteQuestionLinks with supported relation and section |
| Supported intelligence/derivative data | schema 2 only after the application's exact validation gates |
| Correction to existing content | Correction proposal, not normal new-content import |
| Media-dependent item | Media route, never a text-only fallback |
| Unsupported or unverified item | Explicit blocked/excluded report |

Normalize only according to the app's established identity rules. Repeated PYQ appearances attach to one canonical question rather than making copies for each year. An answer conflict is a review conflict, not permission to merge or invent a new identity. Preserve exclusive PYQ/platform ownership and the existing configured platform policy; do not silently change it from an external coaching review.

Faculty observations can suggest concept emphasis, question-pattern tags, explanatory improvements and review tasks. Record the link, timestamp or quoted location, speaker attribution, extraction date and verification status. They do not independently establish medical correctness, change a canonical key, or grant source rights.

## 6. Deterministic packing and delivery

Pack records in a stable, documented order within all current count and byte limits. Measure actual serialized UTF-8 bytes, not estimated characters. Include or verify all required dependencies for each chunk. A captured target-catalog snapshot may satisfy an existing dependency only if the current validator/staging route supports it and its identity/version is verified.

Keep linked new note/question dependencies together where necessary. A dependency component that exceeds limits is blocked for an explicit supported resolution; do not split it into invalid fragments or truncate clinical text. Repeated source/concept definitions across chunks must remain identical and be supported by the staging contract. Detect conflict before delivery.

Derive import IDs from the immutable release identity, adapter/mapping version and deterministic chunk identity. Retrying the same operation sends identical bytes and IDs. Changing generated bytes requires a new operation identity. Record serialized-file hashes and the target schema version.

Dry-run produces reports only. Staging requires separately authorized repository or authenticated admin delivery. No release adapter writes review attestations, published flags, learner events or private learner data.

Archive the exact generated handoff before staging. A save failure sets persistence_pending and blocks delivery under the archive-first policy. A timeout after a possible upload requires receipt/target reconciliation before retry, to avoid duplicates.

## 7. Correction route

| Change | Identity/version rule |
| --- | --- |
| Additional exam/year provenance | Same canonical question; use the supported provenance update route |
| Corrected stem, answer or explanation for the same task | Same question ID, new immutable content version |
| Materially different clinical task | Separate question or explicitly linked variant after identity review |
| Changed image bytes or annotation | New immutable asset/annotation version and fresh exact question-version binding |

A correction proposal records stable question ID, expected current questionVersionId and content hash, proposed changes, evidence, change reason, originating release and impacted assets/derivatives. Resolve the real correction endpoint or repository-supported workflow during implementation preflight. If it cannot be verified, emit a proposal marked correction_delivery_blocked; do not invent an endpoint or force the payload through the ordinary importer.

Recheck the expected version before staging. A stale base causes a conflict requiring re-review, not an overwrite. Stage a new draft with no inherited human approvals. Require fresh relevant medical, reference, rights and media reviews before publication. A potentially unsafe existing publication may require a separately authorized retirement workflow; the adapter must not retire it automatically.

Historical attempts retain their actual question-version references and historical answer keys. No silent rescoring. Existing published content remains governed by the app's publication/retirement policy while a new draft is reviewed. Private learner corrections remain private and do not automatically alter canonical content.

## 8. Media route

Keep media-required questions blocked until authorized bytes, rights, privacy status, valid media metadata and exact version links are available. Archive permitted original and finalized media alongside checksums before handoff. Do not put patient identifiers, private bytes or expiring signed URLs in public repository content.

The existing media domain defines versioned assets, annotations and question links. Its bundle uses schemaVersion 1 with assets, annotations and questionLinks. Assets carry identity/version, modality, MIME, dimensions, hash, source/rights and review metadata. Annotations and links reference exact asset and question versions. Follow the current validator exactly; a media bundle passing validation does not prove that an authenticated ingestion route exists.

Implementation preflight must verify a real authenticated storage and media-staging route, access controls and supported question/media orchestration. If absent, produce an archived media package with media_delivery_blocked. Do not claim live ingestion or learner delivery.

The handoff must verify stored-byte hash, safe delivery reference, source rights, privacy checks and exact version bindings. Stage the question and its media as a linked draft review unit. Publication is blocked while any required part is missing or stale. Cross-service staging is not assumed to be a distributed transaction: use idempotent stages, recorded partial state and reconciliation. Partial work stays quarantined; cleanup must be recoverable and separately controlled.

Learner-facing prompt delivery excludes diagnosis evidence, answer-bearing labels, review notes and explanatory overlays before response submission. Do not leak answer information through filenames, alt text, captions, URLs or thumbnails. Review prompt media and post-answer explanation media separately. A corrected image invalidates the prior binding/review fingerprint.

## 9. Outputs and receipts

The adapter produces generated import JSON chunks, correction proposals, media bundles where applicable, an ID mapping, exclusions/conflicts, validation report and an ingestion guide. Generated files are part of a new immutable handoff package linked to the originating content release; the original release is never edited to add them.

Archive receipts record actual Drive file IDs/URLs, hashes and completed-save evidence. A separate ingestion receipt records operation ID, release/manifest hash, adapter version, target contract and environment, exact delivered hashes, target draft IDs, actual responses, conflicts and timestamps. Never infer completion from an HTTP request being sent.

| State | Meaning |
| --- | --- |
| persistence_pending | Required durable save incomplete or unverified |
| portable_export_ready | Portable files saved and internally validated |
| compatibility_pending | Target mapping or route not yet verified |
| app_ingestion_ready | Exact handoff validated for the verified target route |
| staged | Target acknowledges identified drafts; not published |
| partially_staged / delivery_blocked | Some operations incomplete; reconcile before retry |
| published | Only an actual authorized publication event confirms this |

Use per-item and per-route states plus aggregate counts. An eligible subset may be exported only with explicit exclusions and scope; the whole release cannot be described as ready if required items are blocked. Keep receipts as separate append-only artifacts. Update the latest-release index only after the corresponding archive operation succeeds; do not rewrite earlier releases.

## 10. Acceptance tests and verification

Automated fixtures must be synthetic, nonclinical and isolated from live databases. Do not resurrect erased seed material. A later real-content acceptance run needs new owner-supplied material, evidence and separately authorized staging.

Required test coverage:

- A valid original-only release converts into exact schema-1 chunks with unchanged IDs, options, keys and provenance.
- Supported intelligence selects schema 2 and obeys all current derivative gates; unsupported intelligence blocks rather than disappears.
- Same release/adapter/input gives identical output bytes and IDs. A retry cannot duplicate drafts; changed bytes under the same import ID are rejected.
- Boundary and oversized cases enforce each count limit and the actual 1 MiB byte limit, including multibyte text.
- Missing dependencies, duplicate identities, answer conflicts, invalid classifications, unsupported note provenance, unlinked notes and Markdown/JSON disagreement fail clearly.
- Packing preserves dependency integrity; oversized atomic components generate an actionable blocked report.
- Missing/mismatched asset bytes, expired-only references, invalid rights, unsafe privacy status, stale bindings and media importer bypass attempts block media delivery.
- Corrections reject stale expected versions, preserve historic attempts and carry no fabricated/inherited reviews.
- Learner prompt projections do not expose diagnosis evidence, answer labels or explanation overlays.
- Failed saves block delivery; partial staging and timeout retries reconcile from receipts without claiming completion.
- Dry-run performs no external writes. Conversion tests never publish, mutate learner records or contact production.

Passing structural tests does not establish medical accuracy, lawful licensing, semantic equivalence of shortened questions, or actual deployment. Those require their own evidence and authorized review.

## 11. Implementation gates and written-spec review

Before an implementation plan is approved, confirm the current import contract, correction mutation workflow, media ingestion/storage routes, target environment and permission boundary. Keep unsupported routes disabled until real contracts and tests exist. Do not silently broaden authority to add hosting, providers or background services.

The next deliverable after approval is a scoped implementation plan with files to change, synthetic test cases, verification commands and separate delivery approval points. Runtime code, skill-policy changes and deployments are not part of this written-spec operation.

Self-review: the design distinguishes preservation, compatibility, staging and publication; handles immutable correction/media versions; preserves exact handoff copies; defines fail-closed behavior for unavailable routes; and does not claim implementation or human verification.
