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
| correct | Boolean, computed by trusted scoring in a future service |
| durationMs | Nonnegative safe integer |

All fields are required and additional fields are rejected in v1. The contract intentionally excludes clinical histories, personal names, free text and secrets. Additional event types and payload fields require an explicit versioning decision.

The summary counts attempts and correct answers per concept for a requested learner. Identical retries count once; conflicting duplicate IDs raise an error. Accuracy is null with no evidence. No mastery or retention inference is made.

## Content catalog v1 (implemented)
Concept, ContentSource, QuestionVersion and embedded ReviewDecision records are implemented in `src/domain/content.js`. See [field contracts and lifecycle](CONTENT_WORKFLOW.md).

## Planned entities
ConceptRelation, StudySession, ReviewSchedule, PersonalNote, ExamAdapter and richer LearnerProjection. Use references to one canonical concept rather than duplicating it per subject. Track original/recalled/licensed PYQ provenance explicitly; never label generated questions as genuine PYQs.
