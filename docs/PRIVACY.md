# Learner privacy erasure

Status: database contract implemented for product-data erasure v1.

## Purpose

Medical Learning OS treats two requirements as simultaneous invariants:

- learner evidence is append-only during normal operation;
- a valid privacy request can erase learner-scoped product data.

Append-only history is not a justification for retaining personal learner evidence indefinitely.

## Current contract

The registered privacy scope is `learner-privacy-scope-v1`. It covers every current public table with a `learner_id` column.

Use the service-only functions:

- `privacy_learner_scope_status()` — verify schema coverage;
- `privacy_learner_erasure_preview(learner_id)` — inspect transient row counts;
- `privacy_erase_learner_data(learner_id, confirmation, reason_class)` — atomically erase product data.

The confirmation value must equal the learner UUID string. This is an operational safety check, not an authorization mechanism.

Accepted reason classes:
- `user_request`;
- `account_closure`;
- `legal_requirement`;
- `test_cleanup`.

## Account-closure sequence

Do not delete the Supabase Auth user first.

A trusted backend/admin workflow should:

1. verify the account/privacy request;
2. revoke/sign out active Auth sessions so existing access tokens are not treated as immediately invalidated merely by user deletion;
3. call `privacy_learner_scope_status()` and require `complete=true`;
4. optionally call the erasure preview;
5. execute `privacy_erase_learner_data`;
6. verify the preview now reports zero scoped rows;
7. retain the returned non-identifying erasure receipt ID as appropriate;
8. delete the Supabase Auth user through the trusted Auth Admin boundary.

The database function intentionally reports that Auth user deletion and Auth session revocation are not included.

## Evidence immutability

Normal UPDATE/DELETE is blocked for:
- study attempts;
- memory judgments;
- Study Now recommendation receipts;
- scheduler decision events;
- policy experiment assignments;
- exam transition events;
- exam completion receipts.

The privacy transaction opens a transaction-local DELETE-only exception. It closes that exception before writing the erasure receipt. UPDATE is never allowed through this exception.

Mutable learner state such as sessions, revision projections, bookmarks and personal annotations remains governed by its existing domain mutation rules.

## Receipt minimization

`learner_privacy_erasure_receipts` stores:
- random erasure ID;
- contract ID;
- scope version;
- coarse reason class;
- total rows deleted;
- completion time.

It does **not** store learner ID, learner hash, learner digest, user ID or subject ID.

Per-table counts are returned transiently by the erasure function for trusted operational verification and are not persisted in the receipt.

## Future schema rule

Any migration adding a public table with `learner_id` must update the privacy scope in the same change.

If it does not, erasure fails closed with `privacy_scope_requires_update`.

Personal data keyed by something other than `learner_id` must still receive an explicit privacy mapping; the current automatic coverage check cannot discover arbitrary semantic identifiers.

## De-identification

Not implemented in v1.

Do not retain “anonymous” learner histories merely because they might be useful later. Introduce de-identification only when there is a concrete research/institutional requirement, a retention policy, and an assessment of re-identification risk.
