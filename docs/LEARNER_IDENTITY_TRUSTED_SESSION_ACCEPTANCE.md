# Controlled learner identity session acceptance — operator handoff

2 November2026. **Prepared/tested with synthetic adapters; genuine hosted run NOT EXECUTED.** Staging only `vwtdwafjrraptrgeshzt`. Production/human content review unchanged.

## Why live acceptance is blocked here

The connected management plugin deploys functions and inspects SQL, but offers no Auth admin user create/delete operation. The inspected execution environment has no staging operator credentials, issued test tokens, owned synthetic user IDs or private recovery journal. The required preflight returns `trusted_operator_credentials_and_owned_test_ids_required` before loading the SDK or contacting Auth/API. Do not insert Auth rows manually, retrieve secrets through SQL, create a privileged key-relay Edge endpoint, or supply tokens/keys to chat or PR CI.

Existing reviewed lifecycle method: `docs/INTERNAL_SOURCE_REVIEW_STAGING_IDENTITY_LIFECYCLE.md` on [PR374](https://github.com/mdmoazzam291/Medical_Learning_OS/pull/374). It requires the trusted operator host, independently verified staging-only credentials, explicit opt-in and an external private recovery journal. That runner handles one owned account; this probe assumes the operator separately manages **two** controlled identities and their cleanup. It does not silently expand the lifecycle runner's scope or automatically create accounts.

## Probe scope and constraints

`scripts/learner-identity-staging-acceptance.mjs` uses a pinned isolated SDK2.118.0 from `ops/staging-auth-sdk` for actual Auth getUser verification, and a fixed staging API root. It accepts no credential/target URL flags and no admin key. Before any API mapping call, both identities must match the operator's expected private-journal IDs, be distinct, have an `@example.invalid` address and server-owned `app_metadata.mlos_staging_synthetic:true`. User-editable metadata is never authorization.

For each identity, it checks GET/me (no allocation), POST/ensure, confirmed idempotent POST retry, exact GET readback and unsupported target query rejection. The two codes must differ. It also checks anonymous denial and private/no-store/exact-Origin responses. It never puts real account UUIDs or codes in request URLs or report output. A timeout/ambiguous POST stops immediately, with manual reconciliation required; do not rerun automatically. Retried POST occurs only after a confirmed valid response as the explicit idempotency test.

The callback-test library reports `hostedEvidenceAttested:false` and `cleanupVerified:false`; only a trusted actual CLI run can establish observed network assertions, and external independent cleanup/attestation is still required. A passed callback test or ready preflight is not real signed-JWT evidence. Revocation/suspension, provider sign-in linking, mapping backup/restore, no-reuse retention and real reviewer/rights gates are outside this first positive self-only probe.

## Trusted host preparation — no secrets in commands/history

Install only the isolated pinned operator dependency:

```sh
npm ci --prefix ops/staging-auth-sdk --ignore-scripts --no-audit --no-fund
node scripts/learner-identity-staging-acceptance.mjs --preflight
node scripts/learner-identity-staging-acceptance.mjs --run
```

Inject these **only through a trusted process secret mechanism**, never chat/Git/CI artifacts/shell command arguments:

| Environment name | Required value/source |
| --- | --- |
| MLOS_STAGING_REF | vwtdwafjrraptrgeshzt |
| MLOS_STAGING_URL | https://vwtdwafjrraptrgeshzt.supabase.co |
| MLOS_STAGING_IDENTITY_CONFIRM | STAGING_LEARNER_IDENTITY_ACCEPTANCE |
| MLOS_STAGING_PUBLISHABLE_KEY | Independently verified staging publishable key |
| MLOS_STAGING_TEST_TOKEN_A / B | Two fresh tokens from the controlled synthetic accounts |
| MLOS_STAGING_TEST_USER_A / B | Matching expected IDs from the operator's private recovery journals |

A matching key prefix or preflight does not establish project ownership. Independently verify keys/project/test-account ownership before use. No secret/admin key is consumed by this probe; the separate controlled Auth admin lifecycle still needs its own trusted credentials to create/delete users.

## Cleanup and acceptance receipt

Record exact code/deployment versions and sanitized probe status/booleans. Independently recheck account marker/email/UUID ownership before any delete; delete only those two synthetic identities through supported Auth admin methods, verify their absence individually, inspect session removal and mapping cascade, and separately observe token liveness/current API denial. No bulk delete or guessed identity. Retain private journals until creation/deletion and all ambiguous outcomes are reconciled; do not erase a journal merely because HTTP assertions passed. On failure, stop without automatic retries and preserve manual-recovery evidence.

Only after actual positive network assertions and independently documented cleanup can the corresponding hosted self-only gate be updated. This document clears no source-rights, clinical, reviewer, learner onboarding, production or merge approval. The [current staging v4 negative receipt](releases/2026-11-02-learner-runtime-outage-classification.md) remains independent of this unexecuted positive probe; the older v2/v3 receipts are historical.
