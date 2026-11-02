# Learner identity — private mapping and self endpoint (PR #379)

**Status:** draft implementation for isolated validation, **not yet deployed to Supabase**. This is stacked on the Learner Code proposal (#377) and offline algorithm (#378); it does not require or affect Core6 medical content rights.

## Source implementation

| Component | Responsibility |
| --- | --- |
| `supabase/migrations/20261102084000_learner_reference_codes.sql` | New additive `public.learner_reference_codes` table with `auth_user_id` referencing `auth.users.id`, canonical format constraint, DB primary-key uniqueness, unique code, Auth-delete cascade, explicit service-only SELECT/INSERT and enabled RLS with no browser policies |
| `supabase/functions/learner-identity-api/index.ts` | **GET /me** returns only current signed-in learner's persisted code or null; **POST /ensure** allocates only after verified Auth user **and** existing runtime session/access check; no caller-specified target, search or listing |
| `ops/prototypes/learner-identity/learner-code.js` | Existing 80-bit cryptographic format validation and server-only idempotent allocation contract; retries code collisions with readback |
| `scripts/learner-reference-code-db-check.js` | Real disposable PGlite tests for constraints, two learner IDs, ACL denial, no browser RLS policy, service-only INSERT/SELECT, FK, and deletion cascade; intentionally independent of hosted learner data |
| `tests/learner-code-auth-boundary.test.js` | API source-boundary regression for runtime Auth checks, self-only route, never-public asset and role restrictions |

### Caller behavior

1. Learner signs in with existing Google/password identity. The JWT is verified using `auth.getUser(token)`. Existing runtime check verifies `session_id`, account access and suspension.
2. **GET** `/functions/v1/learner-identity-api/me` returns `{contractId:"learner-identity-self-v1",status:"not_assigned",learnerCode:null}` if no server-issued code exists; does **not** create one.
3. **POST** `/functions/v1/learner-identity-api/ensure` with no body generates an immutable code only if valid identity and runtime access. The storage layer enforces user primary key and code unique constraint, rejects unexpected write errors, and re-reads the exact current learner UUID.
4. Same account + multiple sign-in methods/devices always resolves to the same persisted Auth UUID and code. **Not an account-recovery credential**: no entitlement, verified-human status, doctor status or support authority follows from knowing the code.
5. No code query parameters, POST identities, public user enumeration or email lookup. A missing/failed mapping does not block Study, Auth, NeuralVault, Exam, Study Now or personalization.

### Security boundaries

- The table is in the public schema **for compatibility with existing service role Data API**, but is **private by grants and RLS**, not a public profile. Explicit revocation removes Supabase historical public automatic grants. No `anon`/`authenticated` table privileges and no policies; service role gets only SELECT and INSERT.
- The service key is only read inside the Edge runtime. Do not expose the function directly from a client proxy that can choose an arbitrary learner UUID. The real session ID must be present and valid.
- Never put codes in public URLs, search indexes, public learner graphs, event logging, PostHog/Sentry metadata or exam leaderboards. A signed-in learner sees only their own.
- The SQL does not include a signup trigger, force a learner-data backfill, change `auth.users`, or alter any learner FK. Existing accounts can enroll lazily. Service roles cannot UPDATE/DELETE or rotate codes.
- Auth account deletion cascades the mapping; **permanent no-reuse after deletion is not yet guaranteed**. If the owner requires absolute never-reassign, implement a privacy-reviewed minimal tombstone/taken-code registry before release. Current code collisions are extremely unlikely but the design must not misstate this distinction.

### Required staging verification (not completed by repository CI)

- Confirm no SQL conflicts with existing staging migration versions; generate/reconcile the migration ledger under the supported Supabase CLI, **not** by claiming a filename equals an applied migration.
- Obtain independent role/security review of public-schema service-only privileges, root-key exposure, rollback, audit and retention policy; release only into isolated staging first.
- Apply migration in staging and audit `information_schema.table_privileges`, `pg_class.relrowsecurity`, `pg_policies`, anonymous/authenticated blocked access, service-only INSERT/SELECT, two concurrent DB clients and unique collision behavior.
- Deploy `learner-identity-api` **to staging only** after the migration, with existing Auth/runtime-access RPCs available, current exact allowed-origin list, and tested managed JWT/session verification. Real self-only, other-learner, revoked-session, suspended-account, no-signin and bad-origin probes require controlled synthetic accounts and proper cleanup.
- Review Edge logs for accidental codes/secrets; run staged reload/recovery tests; record hosted acceptance receipt and backout procedure. Nothing is approved or deployed by this document.
- Only after staging and explicit release approval, implement copyable Account → Learner ID UX. Do not imply a code exists before actual server readback.

## Rollback / operational safety

This PR is **additive code only**. There is no database write, service deployment or assignment during GitHub CI. If a later staging API deployment fails, disable the endpoint without deleting mapping/history. For database schema rollback, first export/migrate all issued mappings and obtain privacy/owner approval; automatic dropping would lose identity references. Production data and current canonical UUIDs remain untouched.
