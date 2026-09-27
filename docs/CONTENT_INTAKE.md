# Content intake pipeline

Status: foundation implemented and live; production content generation/import remains gated.

## Purpose

Scale reviewed Medical Learning OS content without weakening the existing publication boundary.

The pipeline separates **candidate production** from **medical truth**:

`candidate manifest → staged batch → structural/dedup validation → promoted to in_review → Medical/References/Rights review → verified → trusted publication`

A staged or promoted candidate is never learner-visible merely because it exists.

## v1 scope

Accepted candidate questions must be:

- new stable question identities at version 1;
- provenance `original` or `ai_generated`;
- source-grounded;
- linked to exactly one primary canonical concept;
- structurally complete with a valid answer option;
- promoted only as `in_review` with zero review evidence and no publication timestamp.

Recalled/licensed PYQ claims are excluded. Those belong in the immutable exam-occurrence/PYQ evidence subsystem.

## Batch contract

A manifest has exactly four top-level fields:

- `schemaVersion: 1`
- `concepts`
- `sources`
- `questions`

A batch may contain at most 100 questions and 200 new concepts/sources.

New sources must enter with `rights.status = "unknown"`. The existing Rights review flow is the only authority that may resolve source-rights evidence.

## Mechanical gates

Before staging/promotion, the database checks:

1. exact schema and field sets;
2. stable ID syntax and version-1 identity;
3. option uniqueness and answer-key integrity;
4. exactly one primary concept;
5. every concept/source reference resolves to the live catalog or same manifest;
6. no duplicate question IDs or version IDs;
7. no exact normalized-stem duplicate inside the batch;
8. no exact normalized-stem duplicate against the live catalog;
9. no conflicting stable IDs/stems against another staged batch;
10. no fabricated reviews, publication time, rights clearance, or PYQ provenance.

These are structural safeguards, **not medical-quality judgments**.

## State transitions

### staged

The exact manifest and SHA-256 fingerprint are stored with an immutable `staged` event.

Staging does not touch `study_catalog`.

### promoted

Promotion locks and revalidates the current catalog before appending the batch.

Promotion may add concepts, unresolved sources and questions only in `in_review`. It increments the catalog once and records an immutable promotion event.

Promotion has `publicationAuthority=false`.

### abandoned

A staged batch may be abandoned with a reason. The payload remains immutable and auditable.

Promoted/abandoned batches cannot be rewritten or deleted.

## Review and publication

Promotion feeds the existing authenticated review queues.

Each question still requires independent current-fingerprint evidence for:

- Medical accuracy
- References
- Rights & provenance

Three valid approvals can produce `verified`. Publication remains a separate trusted server-only transition.

## Throughput metrics

`content_intake_pipeline_status()` reports:

- staged batches/questions;
- promoted batches;
- abandoned batches;
- in-review questions;
- verified questions;
- published versions and distinct stable published questions;
- outstanding Medical/References/Rights decisions.

Authenticated reviewers can read this through `review-api /pipeline-status`.

This measures pipeline pressure. It does not infer medical quality, reviewer quality or mastery.

## Current limitations

- Semantic near-duplicate detection is not implemented.
- Exam-blueprint/content-mix targeting is not implemented.
- No AI generation service is connected to intake yet.
- No browser/operator staging or promotion mutation endpoint exists; writes remain service-role-only.
- Question revision intake (v2+) is not implemented.
- Bulk publication is intentionally absent.

## Next production step

Create the first **small, source-grounded real candidate batch**, preferably 5–10 questions, then measure:

- structural rejection rate;
- exact duplicate rejection rate;
- time per review gate;
- rejection reasons by gate;
- verified-to-published conversion;
- reviewer bottleneck by gate.

Only after this loop is clean should generation/import volume rise toward the 180-question mock threshold.
