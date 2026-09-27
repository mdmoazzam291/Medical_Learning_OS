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
