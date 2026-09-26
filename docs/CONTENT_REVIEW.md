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

The UI deliberately avoids bulk approval. Review throughput is secondary to trustworthy medical/reference/rights evidence.


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
