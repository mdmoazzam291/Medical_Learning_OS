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
