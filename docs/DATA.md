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

