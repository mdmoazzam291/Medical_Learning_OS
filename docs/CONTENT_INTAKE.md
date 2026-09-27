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

- True semantic near-duplicate detection is not implemented. A service-only lexical token-overlap preflight is advisory and may flag suspiciously similar stems before staging.
- Exam-blueprint/content-mix targeting is not implemented.
- No AI generation service is connected to intake yet.
- No browser/operator staging or promotion mutation endpoint exists; writes remain service-role-only.
- Question revision intake (v2+) is not implemented.
- Bulk publication is intentionally absent.

## First live pilot

`pilot:rabies:20260927:01` is the first real controlled batch:

- 5 questions;
- 5 new canonical concepts;
- 2 official Government of India NRCP sources;
- all questions entered as `ai_generated`, `in_review`, non-PYQ and unpublished;
- both new sources entered with rights `unknown`, then were independently resolved to `citation_only`;
- catalog promotion: v6 → v7;
- authenticated review completed 15/15 gate decisions with current immutable fingerprints;
- trusted publication completed for all 5 questions;
- current review backlog: Medical 0 / References 0 / Rights 0;
- published stable inventory is now 6.

## Reviewer preflight assistance

The reviewer surface may load a versioned **non-authoritative review-assist packet**. It summarizes current source support, preserves wording concerns and suggests conservative rights handling, but it cannot approve a gate, mark content verified or publish.

For the first rabies pilot, the preflight finds four straightforwardly supported items and one supported item with a wording note: the category III RIG stem is correct among its options but slightly under-specified because wound washing is also part of rabies PEP. The concern remains visible to the reviewer rather than being auto-resolved.

## First observed review-throughput baseline

The first five-question pilot completed its full authenticated review/publication loop.

Observed immutable event timing:
- 15 review decisions over a 26.6-minute first-to-last event span;
- Medical gate span: 5.9 minutes for 5 decisions;
- References gate span: 6.0 minutes for 5 decisions;
- Rights gate span: 8.8 minutes for 5 decisions;
- 2 source-rights decisions were also recorded;
- 5/5 verified questions published successfully;
- 0 rejected versions in this pilot.

This is a tiny operational sample, not a stable throughput estimate. Rights is the apparent bottleneck and should be measured again rather than optimized prematurely.

## Next production step

Run a second controlled batch at approximately 25 questions, still source-grounded and review-gated, while measuring:

- structural/exact-duplicate rejection rate;
- per-gate review time and source-rights reuse;
- revision/rejection reasons;
- reviewer bottleneck;
- verified-to-published conversion;
- semantic near-duplicate/ambiguity failures missed by structural validation.

Do not jump directly to 180 generated questions. Increase volume only if the 25-question loop preserves review quality and auditability.


## Second controlled scale pilot

Batch `pilot:infectious-prevention:20260927:02` scales the same governed loop to 25 questions:

- 25 new canonical concepts and 25 new question versions;
- 5 official CDC source packages, with five questions sharing each package;
- jurisdiction explicitly tagged `guideline-us-cdc`;
- no PYQ claims and no exam-blueprint-fidelity claim;
- live structural validator passed all 25 candidates;
- advisory lexical-overlap report flagged 2 intentional policy-state pairs, both inspected and dispositioned `retain_distinct`;
- promoted questions remain entirely learner-hidden until the existing three review gates and trusted publication transition succeed.

The first pilot showed that evidence entry, particularly Rights review, consumes meaningful reviewer time. The reviewer workspace may therefore prefill **editable draft notes** and **editable source-policy evidence** from the non-authoritative preflight packet. The reviewer must still inspect the exact target, choose every review/right outcome and submit every decision. No draft text has authority by itself.

Do not create the next content batch until this 25-question review loop yields measured throughput, rejection/revision reasons and source-reuse effects.
