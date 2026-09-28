# Data contracts

## Attempt event v1 (implemented)
| Field | Meaning |
|---|---|
| schemaVersion | Exactly 1 |
| type | Exactly question.answered |
| eventId | Stable unique retry/idempotency key |
| learnerId | Pseudonymous learner identifier |
| questionVersionId | Exact content version answered |
| conceptId | Primary assessed canonical concept |
| occurredAt | ISO timestamp in UTC, ending in Z |
| correct | Boolean, computed by the M04a server for server-study events; client-only demo evidence remains separate |
| durationMs | Nonnegative safe integer |

All fields are required and additional fields are rejected in v1. The contract intentionally excludes clinical histories, personal names, free text and secrets. Additional event types and payload fields require an explicit versioning decision.

The summary counts attempts and correct answers per concept for a requested learner. Identical retries count once; conflicting duplicate IDs raise an error. Accuracy is null with no evidence. No mastery or retention inference is made.

## Content catalog v1 (implemented)
Concept, ContentSource, QuestionVersion and embedded ReviewDecision records are implemented in `src/domain/content.js`. See [field contracts and lifecycle](CONTENT_WORKFLOW.md).

## Planned entities
ConceptRelation, ReviewSchedule, ExamAdapter and richer LearnerProjection. Use references to one canonical concept rather than duplicating it per subject. Track original/recalled/licensed PYQ provenance explicitly; never label generated questions as genuine PYQs.

## Server study persistence v1 (M04a)
SQLite tables: catalog, credentials (hash/learner/expiry), sessions (owner, frozen version queue, position, closed flag, question start), attempts (v1 event plus immutable submission receipt), bookmarks. Unique learner/request and session/position keys protect retries and answered slots. Sessions and bookmarks are learner-scoped. See [HTTP and persistence contracts](SERVER_STUDY.md). Server `durationMs` is wall time including interruptions, not the demo's estimated active time; do not combine these time measures into one metric.


## NeuralVault v1 (M06a)
Implemented cloud entities:
- `neural_canonical_note_versions`: immutable canonical note versions keyed to existing catalog `conceptId`, with source IDs, supersedes link, status and SHA-256 content fingerprint.
- `neural_personal_annotations`: learner-owned mutable notes keyed to canonical `conceptId`, optional canonical-note version anchor, optimistic `revision`, and real deletion support.

Canonical note storage does not imply publication. Learner-visible canonical medical notes require a later review/publication gate. Personal annotations are exported with learner data and remain separate from canonical content.

## Canonical learner-intelligence data ownership

The implemented `question.answered` v1 contract remains valid and unchanged. Future event types must be added through explicit schema/event versioning rather than by silently widening or renaming historical records.

The durable distinction is:

```text
observed evidence  → canonical/replayable
inferred state     → versioned, rebuildable projection
policy decision    → immutable decision receipt
analytics          → derived view
```

### Planned event-family coverage

These are roadmap targets, not claims that every event exists today. Use stable names with changing values in attributes/payloads.

1. `session.started`
2. `session.ended`
3. `content.exposed`
4. `question.presented`
5. `question.answer_changed`
6. `question.answered` (implemented v1 foundation)
7. `question.skipped`
8. `confidence.recorded`
9. `hint.requested`
10. `explanation.viewed`
11. `retrieval.attempted`
12. `revision.completed`
13. `image.interpretation_submitted`
14. `clinical.reasoning_action`
15. `mistake.hypothesis_recorded`
16. `confusion.observed`
17. `study.recommendation_generated`
18. `intervention.delivered`
19. `verification.retention_probed`
20. `verification.transfer_probed`

Not every signal needs its own top-level event. Initial option, final option, response timing, answer-change sequence, section context, review state, prior exposure, selected distractor, modality, confidence and help usage belong in the appropriate versioned payload where collected.

### Future learner-concept projection

M07c may eventually materialize a rebuildable `learner_concept_state` projection containing separate estimates for:
- knowledge;
- retention/retrievability;
- reasoning/transfer;
- speed/fluency;
- confidence calibration;
- evidence strength/diversity/freshness;
- uncertainty.

It must not become the historical source of truth. It must include a model/projection version and be reproducible from retained evidence.

Do not embed `recommended_action` or a free-form `misconception_ids[]` array as authoritative learner state. Recommendations belong to versioned Study Now policy receipts; mistake/confusion evidence belongs to normalized mistake/confusion records.

### Intervention-outcome trajectory

Before adaptive optimization, preserve enough linkage to reconstruct:

```text
state snapshot before
        ↓
recommendation / policy version
        ↓
intervention delivered
        ↓
immediate response
        ↓
delayed retention probe
        ↓
transfer probe / exam outcome when available
```

This is the long-term data moat. Raw clicks or total questions completed are insufficient.

### Privacy and deletion

Append-only evidence is an integrity pattern, not an exemption from deletion rights. Learner deletion must remove or irreversibly de-identify applicable learner evidence and rebuild affected projections according to the project's privacy contract.

## Canonical learning event stream v1

The repository now defines a canonical **replay contract** over selected existing learner evidence. It does not replace the physical source tables.

Contract: `study-learning-event-stream-v1`.

Mapped event families:
- `question.answered` → class `observation`;
- `memory.rating` → class `self_report`;
- `study.recommendation_generated` → class `policy_decision`.

Each stream event exposes:
- stable `eventKey`;
- event schema version, family and class;
- `occurredAt` and `recordedAt`;
- canonical `conceptId` / `questionVersionId` when the source supports them;
- `sessionId` when available;
- exact physical source table/id;
- source-specific versioned payload.

Ordering is deterministic by `recordedAt,eventKey`; replay supports a cursor over those two fields.

This stream does **not** infer learner state. `inferenceAuthority=false` and `masteryInferenceEnabled=false` are part of the contract.

Not yet mapped:
- session start/end and exposure events, because current session storage is mutable state rather than immutable events;
- answer-change, confidence, hint and explanation-view events, because they are not yet collected under explicit contracts;
- scheduler policy decisions, which remain in their dedicated immutable-decision design;
- raw exam-run transitions, pending canonical modality mappings;
- NeuralVault personal annotations, which are mutable learner-owned content.

The event-family roadmap remains additive and versioned. New sources join the canonical stream only after their semantics and privacy/integrity behavior are explicit.

## Canonical integrity profile

New attestable JSON-domain artifacts may use `src/domain/canonical-integrity.js`.

Current profile:
- profile version: `1`;
- canonicalization: `JCS-RFC8785`;
- digest: `SHA-256`.

The canonicalizer rejects non-JSON/ambiguous values, non-finite numbers, sparse arrays, cycles, non-plain objects and invalid Unicode scalar sequences. Ordinary object property order therefore cannot alter the digest.

Digest envelopes include algorithm/profile metadata. This is the future migration seam for classical → hybrid → future cryptographic systems, but no signing/proof/PQC implementation exists today.

**Historical fingerprint rule:** do not recompute or migrate existing hashes merely to use this shared primitive. Existing review/source/exam/intake/other fingerprints retain the exact historical function and semantics that created them.

Stable domain identifiers remain separate from database/location/provider identity. A concept/question/exam/artifact identifier must not depend on a Supabase URL, R2 path, cloud host, signature algorithm or future ledger.

## Learner erasure contract v1

Contract IDs:
- scope: `learner-privacy-scope-v1`;
- preview: `learner-erasure-preview-v1`;
- erasure: `learner-erasure-v1`.

Current registered learner-data tables:
- `exam_run_events`;
- `exam_run_receipts`;
- `exam_runs`;
- `neural_personal_annotations`;
- `study_attempts`;
- `study_bookmarks`;
- `study_memory_judgments`;
- `study_policy_experiment_assignments`;
- `study_recommendation_events`;
- `study_revision_state`;
- `study_schedule_decision_events`;
- `study_sessions`.

The scope function compares this allowlist to the live schema's public `learner_id` columns. Missing or unmapped tables make erasure unavailable until the scope contract is updated.

The persistent receipt table intentionally stores no learner identifier or derived learner fingerprint. Per-table deletion counts are transient response data only.

Projection behavior after erasure is simple in v1: all learner-owned projections/state rows are deleted together with their source evidence. There is therefore no residual learner projection to rebuild. If future shared/population projections retain de-identified contributions, they require a separate privacy/rebuild contract.

## M07c inference activation evidence

The activation contract is `digital-twin-inference-activation-v1`.

A candidate packet contains:
- exact model/version;
- locked preregistration plan ID + SHA-256 digest;
- observed target contract and baseline;
- declared knowledge/retention/transfer claim scope;
- preregistered evidence-sufficiency criteria with direction/threshold/observed values;
- offline validation metrics with frozen thresholds;
- prospective validation metrics when shadow validation has completed;
- binary checks for leakage, uncertainty, missingness, subgroup evaluation, rollback/monitoring and intervention attribution.

The platform intentionally does not hardcode sample-size or calibration thresholds in this gate. Candidate-specific thresholds must be locked before evaluation.

Test fixtures may contain synthetic example numbers; they are not Medical Learning OS production thresholds.

No learner-state persistence is introduced by this contract. Future shadow predictions must remain segregated from canonical observed evidence and from authoritative Digital Twin projections until a separately versioned storage contract is accepted.



## Multimodal media bundle v1 — M10a

Implemented pure domain contract in `src/domain/media.js`.

Top-level:
- `schemaVersion: 1`
- `assets[]`
- `annotations[]`
- `questionLinks[]`

Each media asset version binds:
- stable asset/version identity and sequential supersedes link;
- modality;
- JPEG/PNG/WebP MIME type;
- SHA-256 of exact bytes;
- width/height;
- opaque delivery reference;
- source ID/provider/original identifier/source URL;
- copyright, licence and rights evidence;
- diagnosis evidence;
- review state.

Review-state vocabulary is `unverified | ai_assisted | single_review | double_review | gold_standard`. Unverified assets cannot carry reviewer identity or a review timestamp.

Annotations are separately versioned and may be hotspot, bounding box or polygon geometry using normalized 0–1 coordinates. Question links reference exact media/annotation versions and declare role, display order and whether the first look is blind.

`toLearnerMediaPrompt` intentionally excludes diagnosis evidence, provenance/licence/review metadata and annotations. `toLearnerMediaAnnotations` is a separate explicit projection for post-answer teaching/localization flows.

The checked-in media fixture is synthetic software-test data, not medical content.


## Hosted multimodal persistence v1 — M10a

Production migration `20260927222051_m10a_media_persistence_review_binding` materializes the Phase-1 media contract as three service-only immutable tables:
- `content_media_assets` — exact asset version, SHA-256 byte identity, modality, format, dimensions, delivery reference, source/licence/rights metadata, diagnosis evidence and review metadata;
- `content_media_annotations` — exact annotation version, asset anchor, normalized geometry payload, label, canonical concept and author metadata;
- `content_question_media_links` — exact question-version to exact media-version relationship, role, order, blind-first-look flag and annotation-version references.

Direct browser table access is denied. Registration occurs through service-only `content_register_media_bundle_v1`, which accepts new v1 media/annotation records and links only to current canonical concepts and question versions.

Existing Medical/References/Rights review remains the only content review system. `current_review_target_sha256` includes media only when a question has media links, preserving historical hashes for text-only questions while binding future reviews to exact image bytes and linked annotations.

Image usage rights are normalized separately from licence prose. Rights review approval fails closed when any linked media asset has `rightsStatus=unknown`. For actual learner-visible image content, `citation_only` is intentionally not a permitted media-rights state.

`content_media_prompt` is a learner-safe projection and intentionally excludes diagnosis evidence, source/licence/rights metadata, review metadata and ground-truth annotations.


## GT Autopsy v1

`gt-autopsy-v1` is a rebuildable read projection and adds no new persistence table.

Inputs:
- completed `exam_runs.state`;
- matching immutable `exam_run_receipts.receipt`;
- ordered `exam_run_events`;
- exact question versions and primary canonical concept links from `study_catalog`;
- prompt media links/modalities from canonical media tables.

Outputs:
- trusted overall result;
- section-level question/correct/incorrect/unanswered/marked-for-review/score totals;
- concept-level observed attempts and outcomes;
- visual-question observed outcomes and modality list;
- observed answer-change counts and exact score impact;
- up to five non-causal `review-and-retest` candidates.

The projection returns explicit false flags for mastery inference, preventable-marks inference, fatigue inference and confidence calibration. Wall-clock answer timestamps are not represented as active question time.
