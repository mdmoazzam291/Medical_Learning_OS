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
ConceptRelation, ReviewSchedule, PersonalNote, ExamAdapter and richer LearnerProjection. Use references to one canonical concept rather than duplicating it per subject. Track original/recalled/licensed PYQ provenance explicitly; never label generated questions as genuine PYQs.

## Server study persistence v1 (M04a)
SQLite tables: catalog, credentials (hash/learner/expiry), sessions (owner, frozen version queue, position, closed flag, question start), attempts (v1 event plus immutable submission receipt), bookmarks. Unique learner/request and session/position keys protect retries and answered slots. Sessions and bookmarks are learner-scoped. See [HTTP and persistence contracts](SERVER_STUDY.md). Server `durationMs` is wall time including interruptions, not the demo's estimated active time; do not combine these time measures into one metric.
