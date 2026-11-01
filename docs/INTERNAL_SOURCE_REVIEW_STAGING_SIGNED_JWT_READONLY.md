# ADR-134 — Managed staging signed-JWT, read-only acceptance harness

**2026-11-01 · Draft #373 stacked on #372 · source-review release remains OFF.**

## Why this test is now needed

The managed staging RLS checks in #372 used manually injected
`request.jwt.claims` under PostgreSQL role `authenticated`. Those checks
prove SQL policy behavior, **not** that a genuine signed Supabase Auth JWT
can reach a correctly scoped reviewer endpoint. The earlier #368 signed
JWT tests used **disposable local GoTrue** and are not hosted evidence.

A new **non-writing** hosted Auth probe is implemented in
`scripts/internal-source-review-staging-auth-getuser-probe.mjs`. It
accepts only the exact staging project
`vwtdwafjrraptrgeshzt` / `medical_learning_os_staging`, which
is independent from protected production `iyapppmeieqhflnzslao`
and excluded legacy `ueuguguoladoqvtxkumt`.

This test **does not** sign up, log in, refresh, sign out, or create a
reviewer. It requires an independently provisioned **existing**
staging-only, signed-in test session. No project secret or Auth token
is stored in GitHub, code, a PR, the release ledger, or application logs.

## Read-only behavior

Once an operator deliberately runs the script with `--read-only` and
all required staging-only environment settings:

1. Verify pinned project identity, fixed HTTPS origin, project policy,
   publishable-key format, independently supplied test user and session ID,
   JWT structure, expected issuer, audience, role and expiry.
   **Local JWT parsing is untrusted and is not authentication.**
2. Issue exactly one **GET** to
   `https://vwtdwafjrraptrgeshzt.supabase.co/auth/v1/user` with the
   existing access token. Require HTTP 200 and a matching
   **server-verified** user ID.
3. GET the same endpoint with no bearer; require 4xx.
4. GET the endpoint with a modified JWT payload but its original
   signature; require 4xx.
5. Report only sanitized boolean statuses and reason codes. It never
   logs bearer tokens, emails, passwords, user IDs, session IDs or the
   publishable key.

No `/rest/v1/rpc` calls, DDL/DML, `auth.sessions` row queries,
review decisions, immutable receipts or learner content. No automatic
retry. Every possible result keeps migration, review/rights/clinical,
protected-readback, and publication authority **false**.

### Activation contract

The operator must first obtain a legitimate test session by a
**separate, explicitly reviewed provisioning step** on staging, with
a tested cleanup plan. In a trusted local execution environment, supply:

| Variable | Required meaning |
| --- | --- |
| `MLOS_STAGING_READONLY_CONFIRM` | `STAGING_AUTH_GETUSER_NO_WRITES` |
| `MLOS_STAGING_REF` | `vwtdwafjrraptrgeshzt` |
| `MLOS_STAGING_URL` | `https://vwtdwafjrraptrgeshzt.supabase.co` |
| `MLOS_STAGING_PUBLISHABLE_KEY` | That project's publishable **not secret/service-role** key |
| `MLOS_STAGING_TEST_ACCESS_TOKEN` | Already-issued test-only bearer access JWT; never a refresh token |
| `MLOS_STAGING_TEST_USER_ID` | Independently verified staging test UUID |
| `MLOS_STAGING_TEST_SESSION_ID` | Independently verified staging test session UUID |

Invocation: `node scripts/internal-source-review-staging-auth-getuser-probe.mjs --read-only`.

**Do not paste access tokens into chat, GitHub Actions, issue comments,
workflow arguments, scripts, terminal history or repository files.**
Do not expose a service-role secret. Use a controlled local secret store
and dispose of the test session as part of a separately approved plan.
Running the probe automatically from untrusted PR workflows would expose
credentials to modified checkout code, so this PR **does not** do that.

## What was actually tested in this PR

- Deterministic dependency-injected, mock-HTTP Node tests for exact
  staging URL/identity checks, existing bearer validation, good
  server-user binding, anonymous and forged-JWT rejection, hostile
  input, invalid credentials, request failures, and no writes.
- Code and tests are configured for core CI on the draft branch.
- **No real staging bearer token has been supplied or used.**
  Thus genuine hosted signed-JWT positive acceptance **has not run**.

The staging project was rechecked and remained `ACTIVE_HEALTHY`, with
**zero public application tables** and **zero migrations**.

## Separate managed two-connection experiment — INCONCLUSIVE

Two one-off SQL calls were submitted concurrently to managed staging,
with a transaction-scoped advisory lock (not Auth/session rows).
Different PostgreSQL backends were observed (PIDs 15173 and 15174),
but the second transaction **acquired** its lock; it did not demonstrate
that a holder transaction was still active at that instant. An additional
lock-observer attempt did not observe the held advisory lock. The tools
may not have overlapped the operations as intended.

Therefore **no two-connection lock contention, reviewer revocation race,
or transaction ordering is established on managed staging** by these
attempts. Both calls were wrapped in `BEGIN/ROLLBACK`; no permanent
objects, privilege changes, Auth users, or user content were created.

For a definitive race test, provision a separately reviewed staging-only
multi-connection test harness with independently verified transaction
synchronization and cleanup. The local GoTrue concurrency tests are
different evidence and do not substitute for hosted proof.

## Further release prerequisites

- Dedicated non-production Auth test identity with assured removal and
  independently verified issuer/session; no genuine reviewer or real data.
- A narrowly scoped, security-reviewed managed staging Data API readback
  boundary and **no** blanket `SECURITY DEFINER` / public EXECUTE.
- Exact grant issuer approval, reviewer independence, immutable
  request-fingerprint receipt parity and revocation race under two
  independent hosted sessions.
- Explicit decision about the provider-only signout versus PostgreSQL
  transaction consistency gap. `getUser` is useful but not an atomic
  proof of provider signout in a later database transaction.
- Owner security/clinical/source-rights acceptance before any production
  merge, migration, review UI, or `Review → Live`.

This is a **test-harness implementation**, not a passed managed Auth JWT
acceptance, product feature, production deployment or permission to write.
External provider #350 remains OFF.
