# M02c — Source-grounded verification

Status: **contract v1 implemented; persistence and production automation remain gated**.

## Purpose

M02c reduces manual source hunting without creating a second medical-truth or publication system.

The existing governed lifecycle remains authoritative:

`candidate → intake → in_review → Medical / References / Rights → verified → trusted publication`

M02c sits **before** those review decisions:

```text
PYQ / candidate question / concept need
                 ↓
        existing canonical source
                 ↓
     source-version inspection
                 ↓
        relevant passage(s)
                 ↓
       atomic claim candidates
                 ↓
 claim ↔ passage support assessment
                 ↓
 deterministic content checks
                 ↓
 source-grounded verification packet
                 ↓
 routine / focused / expert review routing
                 ↓
 EXISTING authenticated Medical / References / Rights review
                 ↓
 EXISTING trusted publication gate
```

A verification packet is review assistance. It has:

- `productionHumanReviewRequired = true`
- `publicationAuthority = false`

No AI provider, source parser, packet, risk lane or claim candidate may approve production medical content.

## Why this is separate from M02b and M08

M02b owns candidate intake and promotion to `in_review`.

M08 owns exam occurrences, PYQ provenance and Exam DNA evidence.

M02c owns a narrower problem:

> Given an exact question/concept and registered sources, assemble the evidence needed for a reviewer to make a faster, better decision.

Historical PYQ evidence must never be silently converted into current medical truth.

## Canonical rules

### 1. Books are evidence sources, not the Knowledge Graph

One medical concept keeps one canonical identity. Textbooks, guidelines, regulators and exam authorities provide evidence about claims attached to that identity.

Do not build independent "Robbins knowledge", "Harrison knowledge" or "Katzung knowledge" trees.

### 2. Extract on demand

Do not summarize or atomize an entire textbook up front.

Preferred flow:

```text
question/concept demand
  → retrieve relevant section
  → create only needed claim candidates
  → bind exact evidence
  → reuse already-grounded claims when the next item needs them
```

This keeps storage, AI cost and review debt proportional to actual learning value.

### 3. Source version is mandatory

A source reference must preserve the exact version used, for example:

- textbook edition;
- guideline version/date;
- regulator label/version;
- official exam bulletin/version;
- PYQ evidence package/version.

A future edition is a new source version, not a silent replacement.

### 4. Passage evidence is immutable by digest

Every evidence item carries:

- `sourceId`
- `sourceVersion`
- structured locator such as chapter/page/section/table;
- support classification;
- exact passage/content SHA-256 digest;
- rights mode;
- authority class.

The digest binds the assessment to the inspected material without requiring learner-facing reproduction of copyrighted source text.

## Rights model

M02c recognizes:

| Mode | Meaning for verification |
|---|---|
| `owned` | MLOS owns applicable rights |
| `licensed` | use governed by a license |
| `public_domain` | public-domain material |
| `citation_only` | may support verification/citation, but is not a reuse license |
| `unknown` | unresolved; expert/rights review required |
| `prohibited` | must not be used for the proposed workflow |

`citation_only` is deliberately distinct from licensed reuse.

For standard commercial textbooks, the default architectural posture should be **verification + locator + minimal citation metadata**, not republication of pages or long passages. Learner-facing explanations/questions should be independently authored and still pass the existing Rights gate.

The canonical content domain now accepts `citation_only`, matching the live rights-review system.

## Source authority is claim-dependent

There is no universal "best book".

The v1 contract distinguishes:

- `standard_reference`
- `current_guideline`
- `regulator`
- `official_exam_authority`
- `jurisdiction_policy`
- `systematic_review`
- `primary_research`
- `historical_pyq_evidence`
- `other`

Minimum authority rules currently enforced by the deterministic router:

| Claim type | Required supporting authority |
|---|---|
| treatment recommendation | current guideline, regulator or jurisdiction policy |
| dose | current guideline, regulator or jurisdiction policy |
| contraindication | current guideline, regulator or jurisdiction policy |
| screening / prevention | current guideline, regulator or jurisdiction policy |
| regulatory status | regulator |
| exam rule | official exam authority |
| historical exam answer | historical PYQ evidence |

These are conservative routing rules, not medical truth. Human review can still reject an apparently well-sourced claim.

## Claim contract

`AtomicClaimCandidate@1` contains:

```text
schemaVersion
claimId
conceptId
claimType
statement
context
riskClass
evidence[]
```

Supported v1 claim types include foundational facts, mechanisms, diagnostic criteria, investigations, treatment recommendations, doses, contraindications, screening/prevention, regulatory status, exam rules and historical exam answers.

A **candidate** claim is not a verified canonical claim.

## Evidence support vocabulary

Every claim ↔ passage assessment is one of:

- `supports`
- `partially_supports`
- `contradicts`
- `not_found`
- `ambiguous`

Provider/AI output may propose this classification. It does not become production medical approval.

## Deterministic risk routing

The packet builder routes review workload rather than content visibility.

### `routine`

Typical shape:

- deterministic checks pass;
- low-risk claim;
- resolved rights;
- no contradiction/ambiguity;
- at least two supporting evidence items;
- any claim-specific authority requirement is met.

Routine **still requires** the existing production review gates.

### `focused`

Examples:

- only one supporting source;
- partial/ambiguous evidence;
- moderate medical risk;
- `citation_only` evidence needing explicit Rights attention;
- deterministic warning.

### `expert`

Examples:

- source contradiction;
- support not found;
- unresolved/prohibited rights;
- required authority class missing;
- high/critical medical-risk claim;
- failed deterministic content check.

The router must fail toward more review, never toward less.

## Historical PYQ answer vs current medical truth

Store these as distinct claim types.

Example:

```text
historical_exam_answer
  source: recalled/corroborated PYQ evidence
  meaning: what the exam evidence indicates was accepted then

treatment_recommendation
  source: current guideline/regulator
  meaning: current medical recommendation
```

If they differ, preserve both and make the conflict explicit. Never rewrite the historical occurrence to match current guidance.

## AI/provider boundary

Reuse the existing semantic capabilities:

- `content.source.inspect` for bounded source inspection/extraction;
- `content.review.propose` for non-authoritative support/conflict proposals.

Do not add a model-specific content pipeline.

A provider task should receive only explicit source references/passages needed for the target and must return structured output. Provider memory is disposable. Provider output cannot write Medical/References/Rights approvals or publication state.

## Planned persistence schema

**Not live yet.** Introduce only after the contract is exercised on a measured controlled batch and the extra persistence proves useful.

### `content_source_ingestions`

Tracks one ingestable representation of an existing canonical source version.

Suggested fields:

```text
ingestion_id uuid PK
source_id text
source_version text
content_sha256 text
rights_mode text
storage_ref text
parser_version text
status text
ingested_at timestamptz
```

Do not store copyrighted textbook bodies in learner-visible tables.

### `content_source_passages`

```text
passage_id uuid PK
ingestion_id uuid FK
locator_json jsonb
passage_sha256 text
storage_ref text
created_at timestamptz
```

The exact source material may live in rights-controlled storage; the canonical record can retain locator + digest + storage reference.

### `content_claim_candidates`

```text
claim_id text PK
concept_id text
claim_type text
statement text
context_json jsonb
risk_class text
status text
created_at timestamptz
```

Do not call this table `verified_claims` until a separate claim-verification authority exists.

### `content_claim_evidence`

Append-only relation:

```text
claim_id
passage_id
support
assessor_kind
assessor_ref
assessed_at
evidence_digest
```

### `content_verification_packets`

Immutable review-assist receipts:

```text
packet_id uuid PK
question_version_id text
target_digest jsonb
risk_lane text
packet_json jsonb
created_at timestamptz
non_authoritative boolean always true
```

### Security when persistence is introduced

- RLS enabled on every exposed-schema table;
- revoke `anon` and `authenticated` direct access by default;
- service-only writes;
- exact grants rather than relying on default privileges;
- immutable evidence/packet rows after insert;
- no SECURITY DEFINER helper unless genuinely required and separately permission-audited;
- existing review-api may expose only the review packet needed by an authorized reviewer;
- packet persistence must never grant publication authority.

## Planned internal API

Also **not live yet**.

Conceptual application-service operations:

```text
inspectSource(target, sourceRefs)
buildVerificationPacket(questionVersionId)
getVerificationPacket(questionVersionId)
```

If HTTP routes are later needed, keep them authenticated/service-scoped. No M02c route may:

- approve a review gate;
- mark a question verified;
- publish;
- mutate PYQ occurrence history;
- create rights clearance from an AI judgment.

The existing review-api remains the human authority surface.

## Textbook/source ingestion workflow

When an operator provides a standard book or other source:

1. identify the canonical source and exact edition/version;
2. record rights posture before processing;
3. create a stable digest of the exact ingestable artifact;
4. parse structure into addressable locators;
5. retain content only in rights-appropriate storage;
6. retrieve passages lazily for demanded concepts/questions;
7. create claim candidates only for needed assertions;
8. run deterministic + semantic support checks;
9. create a non-authoritative packet;
10. feed the packet into the existing review workspace.

A new edition does not bulk-overwrite prior evidence. It creates new source-version evidence and allows impact analysis against dependent claims/questions.

## PYQ workflow

A PYQ upload should first enter **M08 exam-occurrence evidence**, preserving whether it is official, licensed, corroborated recall or single recall.

Then:

```text
PYQ occurrence
  → normalize/match question family
  → map canonical concept/tested facet
  → identify answer/explanation claims
  → inspect registered current sources
  → build verification packet
  → keep historical-answer evidence separate
  → existing governed content/review flow for any learner-facing derivative
```

M02c must never invent NEET-PG/INI-CET frequency or official wording.

## Validation experiment

Use the next controlled content/PYQ grounding set to measure whether M02c actually reduces workload.

Track:

- % questions mapped to usable canonical concepts;
- % material claims source-bound automatically;
- % claims needing manual source search;
- contradictions/ambiguities found;
- routine/focused/expert distribution;
- reviewer minutes per question;
- reviewer minutes per new claim;
- verified claim/evidence reuse per question;
- reviewer correction rate of packet proposals;
- post-publication correction rate;
- rights-review minutes;
- AI/API cost per question.

The first success criterion is **lower review effort without a higher correction/error rate**, not a vanity automation percentage.

## Stop rule

Do not create a giant textbook corpus, vector database, claim graph or autonomous publication agent merely because this contract exists.

Persist and scale the layer only when measured use shows that:

`source/claim reuse + better triage > added ingestion/storage/review complexity`.
