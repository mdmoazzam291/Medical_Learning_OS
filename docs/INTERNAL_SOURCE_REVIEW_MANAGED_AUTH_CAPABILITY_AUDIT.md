# Internal Admin source review — managed Supabase Auth capability audit

**2026-11-01; ADR-134 / issue #353.** This is a source-review security decision and
READ-ONLY capability audit, **not** approval for a hosted review endpoint,
managed SQL migration or learner publication. Draft branch stacked on #364.

## Purpose and verified environment

The linked Supabase inventory contained:
- Active project named `medical_learning_os` (PostgreSQL 17.6).
- An inactive legacy `NEETPG2027` project.
- **No separately designated MLOS nonproduction project.**

Accordingly, a single **catalog/privilege-only SELECT** was performed on the
active MLOS project. It queried **no users, sessions, JWTs, grant records or
learner data**, and made **no database changes**. The exact SQL is stored in
`scripts/internal-source-review-managed-auth-capabilities.sql` and is covered
by a static read-only check and an offline fail-closed classifier.

Observed permission metadata on 2026-11-01:

| Capability metadata | Result |
| --- | --- |
| `auth.sessions` exists | yes |
| `authenticated` has `USAGE` on `auth` schema | yes |
| `authenticated` direct `SELECT` / `UPDATE` on `auth.sessions` | **no / no** |
| `service_role` has `USAGE` on `auth` schema | yes |
| `service_role` direct `SELECT` / `UPDATE` on `auth.sessions` | **no / no** |
| Host database PostgreSQL version | 17.6 |

Schema `USAGE` is NOT equivalent to row access or permission to acquire
row locks. The same query executed through an administrator connection does
not imply that an application JWT-scoped role has those rights.

## Decision

**DO NOT port the disposable #361/#362 `FOR SHARE auth.sessions` or
privileged `SECURITY DEFINER` fixture directly to hosted production.**

Supabase's official Auth session documentation confirms that signed JWTs
include a `session_id` that can be correlated with `auth.sessions`.
However, Supabase's knowledge base also warns that locking Auth-owned
rows can interfere with provider operations, and recommends using
application-owned tables or advisory locks for application concurrency
instead of relying on Auth-managed rows as a general lock substrate.

References:
- https://supabase.com/docs/guides/auth/sessions
- https://supabase.com/kb/troubleshooting/permission-errors-when-granting-custom-roles-access-to-the-auth-schema
- https://supabase.com/docs/guides/auth/managing-user-data

No new `auth` schema grants, membership inheritance, provider triggers,
row locks, public definer RPCs, browser service keys or source approval flags.

## Preferred design for a separately authorized nonproduction prototype

The existing trusted server route verifies an access token through Supabase
Auth `getUser(token)` and rechecks MLOS runtime access; the database action
must still obtain its own verified user-scoped identity at the trusted
PostgREST transaction boundary. The exact source-review authorization
transition should lock only **MLOS-owned records**: immutable package/version,
a scoped reviewer grant with audited grant/revoke history, and an
application-owned review access epoch or revocation status.

All grant/revoke writers must share a deterministic lock order with review
decision/readback writers. A test must prove both transaction orders,
idempotent receipt, unchanged source digest and no cross-account access.
Only after this is independently security-reviewed should an explicit
migration be considered.

**Important unsolved guarantee:** A provider-only signout may race with a
review decision after a server Auth check. An application-owned grant ledger
alone cannot prove atomicity with provider `auth.sessions` deletion.
Require a documented provider-supported session-state recheck strategy,
measured invalidation bounds and a separate race acceptance on staging;
where those guarantees are insufficient, block review writes, rather than
claim immediate signout revocation. The app-specific revoke endpoint can
atomically invalidate its own grant, but it cannot retroactively make all
third-party/provider-initiated logout events atomic.

Do not use a user-controlled JWT `user_metadata` claim as an authority source.
Grant issuer qualification and human independence must be established
separately from ordinary Admin role/learner identity.

## Release gates after this audit

1. **Provision/identify a genuinely separate staging Supabase project.**
   The inactive `NEETPG2027` project is NOT an authorized staging project.
2. Run the same catalog-only audit in staging, then test least-privilege
   JWT-bound session revalidation and revocation ordering with synthetic
   accounts and tightly scoped grants. No production accounts or content.
3. Independently review the database grants, definer ownership, Data API
   exposure, RLS and readback authority. Validate ambiguity/restart,
   backup/restore, denied roles, issuer/audience and Auth lifecycle cases.
4. Obtain actual source-rights evidence, reviewer qualification and owner
   authorization before merging the staged source-review stack or creating
   any production migration or Admin review UI.

The offline `assessManagedAuthSessionCapabilities` classifier is a diagnostic,
not a permission engine; **every possible result keeps release approval
false**. All existing #352–#364 branches remain draft and unmerged. External
provider #350 remains deferred/OFF.
