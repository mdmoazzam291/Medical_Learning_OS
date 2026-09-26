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
