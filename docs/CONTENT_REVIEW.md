# Authenticated content review foundation (M04c)

## Purpose

M04c turns the M02 review model from synthetic in-memory metadata into authenticated, durable review evidence. This layer exists to answer a narrow question reliably:

> Which authorized reviewer approved or rejected which exact content target, under which review gate?

It does **not** publish medical content by itself.

## Canonical review gates

The existing M02 gates remain unchanged:

- `medical`
- `references`
- `rights`

A reviewer must be explicitly granted each gate. Learner accounts are never automatically reviewers, and being a doctor/medical student does not implicitly grant review authority.

## Persistent records

### `content_reviewer_grants`

Current authorization state only.

Primary key:
- `reviewer_id`
- `review_kind`

The table is server-only. Browsers cannot read or mutate reviewer grants. App service credentials can read grants but cannot create, update, or delete them directly.

### `content_review_events`

Immutable authenticated review evidence.

Each row binds:
- one `question_version_id`
- one review kind
- the authenticated reviewer UUID
- approved/rejected decision
- review notes
- server timestamp
- `target_sha256`

There can be only one review decision per kind per question version. A rejected version therefore requires a new corrected question version rather than overwriting history.

## Review target hash

The database computes `target_sha256` itself. The hash covers:

1. the exact question-version JSON in the canonical catalog, and
2. all referenced source records, sorted by `sourceId`.

This prevents an approval from being silently reused after the reviewed question or referenced source package changes.

The caller never supplies the hash.

## Trusted mutation path

Direct inserts into `content_review_events` are not granted to the application service role.

The only application mutation path is:

`record_content_review(questionVersionId, reviewKind, reviewerId, decision, notes)`

The function:

1. checks the reviewer has the requested grant,
2. verifies the question exists and is currently `in_review`,
3. blocks author self-review when `authorId` is the reviewer UUID,
4. resolves all referenced sources,
5. hashes the exact review target,
6. inserts one immutable review event with a server timestamp.

The function is executable only by the trusted service role. A future `review-api` must resolve the authenticated reviewer from their JWT and pass that UUID server-side. It must never accept reviewer identity from the browser.

## What this does not do yet

- no reviewer UI
- no reviewer grant-management UI
- no medical content is published
- no automatic promotion from review events into `study_catalog.reviews`
- no publication endpoint
- no claim-level citation review
- no institution-specific reviewer policy

The next M04c step is a small authenticated `review-api` that exposes pending review targets to authorized reviewers and records decisions through the database function. Publication remains a separate gate after authenticated review evidence is proven.


## Authenticated review API

`supabase/functions/review-api/index.ts` is the trusted HTTP boundary for reviewer workflows.

Authentication follows the same production-shaped rule as the learner study API:

1. the browser supplies only its own Supabase Auth access token,
2. the Edge Function verifies that token with Supabase Auth,
3. reviewer UUID is derived from the verified user,
4. reviewer grants are loaded server-side,
5. the browser never supplies reviewer identity.

Routes:

- `GET /me` returns only the authenticated reviewer's granted review kinds.
- `GET /queue?kind=...` requires the matching grant and returns only `in_review` question targets not already decided for that gate.
- `POST /reviews` accepts only question version, gate, decision and notes. It calls the trusted `record_content_review` function with the server-derived reviewer UUID.

The API does not publish content, modify reviewer grants, expose learner evidence or accept answer/mastery data.

## Live schema verification

The M04c review-evidence migration has been applied to the dedicated Supabase project.

A rollback-only verification proved that:
- an authorized synthetic reviewer path can create exactly one review event,
- the database-generated target fingerprint is 64 lowercase hexadecimal characters,
- `service_role` may read grants/events and execute `record_content_review`,
- `service_role` cannot directly insert review events or reviewer grants,
- `authenticated` cannot read the review tables or execute the review-recording function.

No grant or synthetic review persisted after verification.


## Atomic review projection

Authenticated review events are the durable evidence; the catalog's `reviews` array and workflow `status` are a projection of that evidence.

`record_content_review` performs both operations in one database transaction:

1. authenticate the requested review gate through `content_reviewer_grants`,
2. resolve the exact `in_review` question and referenced sources,
3. compute a stable review-target hash,
4. reject target drift against earlier review events,
5. insert the immutable review event,
6. rebuild the question's `reviews` array from persisted events,
7. change status to `verified` only when all three gates are approved,
8. increment the shared catalog version.

The review hash deliberately excludes `status`, `reviews` and `publishedAt`. Those fields are workflow metadata changed by the review/publication process itself. All substantive question fields and the full referenced source records remain inside the fingerprint.

If any review decision is `rejected`, that question version is blocked from further review. The correction path is a new question version, preserving the rejected evidence instead of overwriting it.

This still does **not** publish content. `verified` is only the state that makes a later publication transition eligible.


## Verified publication gate

`publish_verified_content(questionVersionId)` is the first trusted verified → published transition.

Publication is allowed only when all of the following remain true at publication time:

- the exact question version currently has status `verified`,
- all referenced sources still exist,
- every referenced source has resolved rights: owned, licensed or public domain,
- exactly three review events exist for that question version,
- all three decisions are approved,
- each review event matches the current fingerprint for its own medical, references, or rights gate,
- every referenced source has current immutable rights evidence bound to the source fingerprint,
- no newer version of the same question has already been published.

The database generates the publication timestamp, updates the target to `published`, retires any previously published version of the same question, and increments the shared catalog version in one transaction.

The function is executable only by the trusted service role. There is intentionally no browser publication endpoint yet. Authenticated review and publication remain separate privileges.


## Live verification result

The live Supabase project passed rollback-only M04c verification without leaving synthetic content behind.

Verified properties:

- historical three-gate verification proved transactional projection before the later gate-specific fingerprint model was introduced,
- review events and catalog review/status projection are transactionally consistent,
- canonical review timestamps use UTC ISO strings with milliseconds,
- three approvals advance only to `verified`,
- `publish_verified_content` rechecks each gate-specific target plus current source-rights evidence,
- publishing a newer version retires the previous published version atomically,
- learner/browser role cannot execute the publication function,
- no reviewer grants, review events or synthetic questions remain after rollback.

The deployed `review-api` is active at version 2. It still has no reviewer grants to serve, by design.


## Reviewer workspace

The browser reviewer surface lives at `/web/review.html`.

It is intentionally separate from the learner study interface. The page can load only after an existing Supabase Auth session is present, then calls `review-api/me` to discover server-side grants.

Behavior:

- accounts with no review grants see no queue and no review controls,
- the Cloud account page shows the reviewer-workspace link only when `review-api/me` returns at least one grant,
- reviewers may switch only among gates they are actually granted,
- each queue item exposes the exact in-review question version plus its referenced source package,
- answer key, explanation, provenance and source-rights evidence are visible to the reviewer,
- review notes are mandatory,
- decisions are submitted one version/gate at a time,
- the browser submits only question version, review gate, decision and notes,
- reviewer identity is never sent by browser code,
- the workspace contains no publication control.

The UI now separates **judgment** from **typing**. Normal question and NeuralVault review can be approved or rejected without entering free text. The server generates a structured audit note from the exact target, gate, decision and reason code.

Bulk controls are permitted only as a review-compression mechanism:
- each exact target still receives its own immutable gate receipt;
- bulk review is atomic and bounded;
- the authenticated reviewer identity is always derived server-side;
- approval advances only the selected gate;
- bulk review never publishes content;
- a master action requires an explicit inspection attestation plus exact-count confirmation;
- the measured M02c References pilot remains isolated from general master actions so its workflow evidence is not contaminated.

The preferred workflow is **select reviewed targets → one gate-level decision → separate immutable receipts**, not blind approval of an uninspected backlog.


## First genuine medical review package

The first real medical review target is stored at:

`data/medical-seed-anaphylaxis-review.json`

It contains one AI-generated, source-grounded question on immediate treatment of anaphylaxis after vaccination.

Source:
- CDC, *Preventing and Managing Adverse Reactions*, page dated 2024-07-25.
- The clinical recommendation used for the original item is that immediate intramuscular epinephrine is the treatment of choice for anaphylaxis with respiratory/cardiovascular features.

Provenance policy:
- the item is explicitly `ai_generated`,
- it does not claim NEET-PG/INI-CET/PYQ provenance,
- wording is original rather than copied from an external question bank,
- it enters the system as `in_review` with zero review events and no publication timestamp.

Rights policy:
- source-level rights remain `unknown` rather than inferring blanket clearance,
- CDC's agency-material policy says most CDC site information is public domain but acknowledges exceptions, and this clinical page also contains adapted/cited third-party material,
- the rights reviewer must resolve that uncertainty before publication,
- the publication function already fails closed while any referenced source has unresolved rights.

This package is intentionally tiny. Its purpose is to prove one complete genuine medical-content lifecycle before scaling ingestion.


### Live seed state

The first medical seed is now present in the dedicated Supabase catalog as catalog version 1.

Live invariants after loading:
- one `in_review` question,
- zero `published` questions,
- zero reviewer grants,
- zero review events,
- source rights remain unresolved.

This is deliberate. The item can now exercise the real reviewer queue once a reviewer is explicitly authorized, while the learner study API continues to return no publishable medical content.


## Gate-specific review fingerprints

One shared review hash is too coarse because the three gates attest to different claims. The current model uses one target fingerprint per review gate:

- **medical** hashes the clinical question itself: stem, options, answer key, explanation, version lineage and concept links.
- **references** hashes the reviewable question plus source identity/version metadata, but deliberately excludes source-rights metadata.
- **rights** hashes provenance, source IDs and the complete referenced source records including rights status/evidence.

This prevents a legitimate rights-resolution update from invalidating an already completed medical or references review while still making each gate fail closed when its own relevant target changes.

Publication recomputes all three current gate-specific hashes and requires each immutable review event to match its own gate's current target.

## Source-rights evidence

Rights status is no longer merely mutable catalog metadata.

`source_rights_events` stores one immutable decision for each versioned `sourceId`:

- reviewer UUID
- owned/licensed/public-domain/restricted outcome
- evidence
- database timestamp
- SHA-256 fingerprint of the source record excluding the rights projection itself

Only an authenticated reviewer with the `rights` grant can create a rights event through the trusted `review-api`.

The catalog's source `rights` object is updated transactionally from that event. A rights-gate approval is blocked unless every referenced source:

1. has an allowed status: owned, licensed, or public domain,
2. has a persisted rights event, and
3. still matches the source fingerprint reviewed in that event.

Publication repeats the same evidence check. If source identity/version metadata changes under the same source ID, stale rights evidence fails closed.

The reviewer workspace exposes source-rights resolution only while the rights gate is selected. A restricted source can be recorded as restricted, but the question cannot receive a rights approval or publish while referencing it.


### Live gate-specific verification

The deployed model was exercised against the real first medical seed inside rollback-only transactions.

Observed:
- medical, references and rights produced three distinct current target hashes,
- one source-rights event projected the source to an allowed status,
- the rights event fingerprint matched the current source fingerprint,
- all three review events matched their own recomputed current targets,
- three approvals advanced the question to `verified`,
- the publication function accepted the verified package only after those checks,
- rollback restored the live catalog to one `in_review` question with unresolved rights and no persisted review evidence.

This verifies the architecture without pretending that a synthetic operator action is a real human review.


## Reviewer authorization governance

Reviewer access is not a boolean attached casually to an account. The authorization layer now has two parts:

### Current projection

`content_reviewer_grants` stores currently granted review capabilities and now includes:

- review kind
- server timestamp
- granting actor
- reason
- optional expiry

A grant is active only while `expires_at` is null or still in the future.

### Immutable authorization history

`content_reviewer_grant_events` records every grant/revoke action with:

- reviewer
- review kind
- actor
- reason
- optional grant expiry
- database timestamp

The application service role may read this audit trail but cannot mutate it directly.

### Trusted mutation

`set_content_reviewer_grant(...)` is the only application grant/revoke mutation path. It is service-only and records the current projection and immutable event together.

`review-api` no longer reads the grants table directly. It calls `get_active_reviewer_grants`, and the database review functions independently call `has_active_reviewer_grant` at decision time.

Therefore an expired or revoked grant fails closed even if a reviewer left a browser tab open.

There is intentionally no browser grant-management UI yet. A future admin/operator API must derive the granting actor from an authenticated operator identity; it must not accept an arbitrary `actor_id` from browser input.


### Live authorization verification

Reviewer authorization governance has been exercised in the live Supabase project inside a rollback-only transaction.

Observed properties:
- service-only grant mutation works,
- a grant can carry an expiry,
- revocation removes active authorization,
- grant and revoke each append immutable audit evidence,
- the normal `authenticated` browser role cannot call the grant-management function,
- rollback leaves no real reviewer capability or audit rows behind.

The live first medical seed therefore remains unreviewed until an account is deliberately authorized outside the learner surface.

## Media-bound question review

A question with linked media cannot be defensibly reviewed from stem/options/source text alone. The authenticated review queue therefore supplies an exact media review packet for the selected gate.

The packet contains:
- signed short-lived media delivery for the reviewer;
- immutable media-version identity and display role;
- the current gate-specific media review target;
- the same current target SHA-256 that the review mutation will bind to.

Medical, References and Rights packets deliberately differ because each gate inspects different evidence. Reviewers must inspect the media packet before approving. AI/source preflight remains non-authoritative and cannot substitute for this human decision.

The detailed media-target RPC is service-backend-only; learner and ordinary authenticated roles cannot call it directly.


## Human-attested review compression

The review system may reduce repetitive browser mechanics without reducing the number or integrity of review judgments.

Two service-only paths now exist:

- `record_full_question_review_bundle`: one explicit human attestation for an exact, previously unreviewed question can record Medical, References and Rights approvals atomically. Each gate keeps its own note, gate-specific fingerprint and immutable review event. The reviewer must currently hold all three grants, source-rights prerequisites must already pass, and the function has no publication authority.
- `record_content_review_batch_with_measurement`: M02c References workflow v2 submits exactly seven item-level decisions and notes in one atomic transaction after one session-level attestation. It reuses `record_content_review` for every target and records one timing receipt only after all seven reviews succeed.

Neither path permits AI/source preflight to choose review decisions. Prefilled notes are editable evidence aids only. If any target should be rejected, the reviewer must select rejection for that target (batch path) or use the existing individual reject control (full-question path).


## Review necessity and automation boundary

Not every object deserves the same review burden.

### No human review required by default
- schema/shape validation;
- identifier uniqueness;
- version sequencing;
- hash/digest consistency;
- source existence;
- exact-duplicate checks;
- deterministic permission/security checks;
- purely structural concept anchors such as current `conceptId`, label, aliases and subject tags.

The present concept model is a structural taxonomy anchor, not a versioned medical-claim object. Adding a separate concept-approval ledger now would duplicate authority without improving safety. If concepts later gain versioned definitions, prerequisite claims, competency assertions or clinically meaningful graph edges, those semantic claims should receive their own review target type.

### Human review remains required today
For production learner-facing medical content:
- Medical: keyed answer, explanation, scope, safety and clinical correctness;
- References: the cited source directly supports the material claim;
- Rights/provenance: permitted factual use, provenance accuracy and source-rights evidence.

Human review is especially important for treatment decisions, doses, thresholds, guideline-sensitive recommendations, images and any content where a false approval could teach unsafe medicine.

### Review may be compressed
Human review does **not** require handwritten notes. Zero-typing structured decisions, source-first inspection, selection batches and full-question bundles are acceptable when the exact target fingerprint and immutable per-gate receipts are preserved.

Publication remains a separate revalidation boundary.

## Future AI-agent review authority

AI may already assist with source gathering, claim extraction, draft notes, duplicate detection and review proposals. It must not silently become production authority.

A future reviewer agent should emit a versioned proposal containing:
- exact target ID and target SHA-256;
- review gate;
- proposed approve/reject/abstain decision;
- claim → source evidence bindings;
- source/version/freshness metadata;
- model/provider/tool/prompt-contract versions;
- uncertainty and explicit abstention reasons;
- authoring-agent identity so self-review can be blocked;
- cost/latency metadata where useful.

Promotion path:
1. **proposal-only** against human decisions;
2. **shadow evaluation** on unseen reviewed targets;
3. measure false-approval rate, calibration, abstention quality and subgroup/source-domain failures;
4. require conservative confidence bounds and explicit safety guardrails;
5. allow auto-decision only for a versioned low-risk policy scope;
6. continue sampled human audits and automatic rollback to proposal-only on drift.

Even a qualified AI review receipt should not directly publish content. Publication must recheck current target hashes, source-rights evidence, authority-policy version and all required gate receipts.

This creates a clean future transition from human-every-item review toward **AI-first, human-on-exception** without rewriting the canonical review ledger.


## Learner-originated content issue triage

Learner-private corrections remain a NeuralVault learner-owned overlay. When a learner separately submits a possible canonical error, that report now enters the existing authenticated reviewer workspace as a triage signal.

### Reviewer inbox

`GET /learner-reports` is available only after the normal reviewer JWT boundary resolves at least one active Medical, References or Rights grant.

The server:
- reads learner reports and prior triage evidence through the trusted service boundary;
- removes already-triaged reports;
- excludes the current reviewer's own learner reports;
- groups remaining reports only when target type, exact target ID and target SHA-256 all match;
- attaches the current/historical canonical question or note plus source package when available;
- strips learner identity before returning the browser payload.

The browser sees report category, optional learner-supplied details and only correction text the learner explicitly chose to share. It never receives learner UUID/email from this workflow.

### Final triage

`POST /learner-reports/triage` accepts:
- exact report IDs;
- one reviewer gate;
- one final outcome;
- one structured reason;
- the required human inspection attestation.

Reviewer identity is derived from the verified JWT and never accepted from browser input.

The database function `triage_learner_content_issue_reports` independently:
- checks the reviewer still has the selected active grant;
- blocks reviewer self-triage;
- requires all report IDs to bind the same exact target snapshot;
- records one immutable triage event per report;
- rejects repeated triage.

Outcomes:
- `no_canonical_issue` closes the report after inspection;
- `correction_required` creates durable correction-needed evidence only.

Neither outcome mutates canonical content, learner state, publication status, Study Now, scoring or mastery. A warranted correction must be authored as a new canonical/question version and pass the normal review/publication gates.

### Privacy

The triage table contains reviewer identity but no copied learner identity. It references the original learner report. Learner privacy erasure deletes the report and cascades its triage receipt only inside the existing transaction-scoped erasure exception.

Repeated report counts may prioritize reviewer attention. They never function as correctness votes or automatic review decisions.
