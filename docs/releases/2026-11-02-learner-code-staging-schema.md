> **Subsequent verified update, 2026-11-02:** The missing session-validation RPC was later restored to the isolated staging database from the production-equivalent definition. Its installed PostgreSQL function digest and service-only execution privileges now match production. Read the [subsequent parity receipt](2026-11-02-learner-runtime-session-parity.md). The original table-only observations below are retained as historical evidence; authenticated Edge acceptance remains unverified.

# Learner Code v1 — isolated staging database migration receipt

**Date:** 2026-11-02 · **Project:** `medical_learning_os_staging` (Supabase project `vwtdwafjrraptrgeshzt`, ap-south-1) · **Production:** untouched.

**Operation:** Ran the exact committed SQL from `supabase/migrations/20261102084000_learner_reference_codes.sql` through Supabase's managed **staging** `apply_migration`. The provider returned success and recorded migration **`20261102033205`**, name `learner_reference_codes`. The provider-generated migration version differs from the proposed repository filename; retain this association when reconciling migration histories and do **not** rewrite already applied provider history.

## Verified read-only after migration

| Probe | Observed result |
| --- | --- |
| Staging `public.learner_reference_codes` | Exists |
| Existing assigned learner codes | **0** |
| PostgreSQL row level security | **Enabled** |
| Public/anon SELECT | **Denied** |
| Ordinary authenticated SELECT and INSERT | **Denied** |
| `service_role` SELECT and INSERT | **Granted** |
| `service_role` UPDATE and DELETE | **Denied** |
| Database constraints | 1 UUID primary key, 1 unique code constraint, 1 Auth-user FK |
| Browser-readable RLS policies | **0** (intentional server-only mapping) |
| Security advisor | 1 **informational** `rls_enabled_no_policy` notice (expected for this private mapping; [reference](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)) |
| Required `public.learner_runtime_access_v1(uuid,uuid)` | **ABSENT** from staging; dependent endpoint must NOT be deployed as ready |
| Staging Edge Functions | **0** currently listed |

The provider security advisor's RLS-without-policy notice is **not** a request to create a browser policy. The design intentionally denies `anon` and ordinary `authenticated` Data API access and performs all operations in an authenticated, server-authorized function.

## Actual deployed scope versus not deployed

**Applied only:** additive `learner_reference_codes` table and its explicit grants and constraints. **No** Auth sign-ups, learner IDs, source/medical records, app tables, existing learner history, admin roles, RLS permissions on other tables, passwords, runtime functions, production schemas, Cloudflare Pages or Edge API deployments were changed. No learner code was assigned. This was not a production release.

**Not yet done:** deploy `learner-identity-api`, implement the missing verified runtime-access dependency in the staging environment through its original security-reviewed migration stack, demonstrate an actual authenticated `GET /me`/`POST /ensure`, two-session isolation, suspended-account rejection, real HTTP/CORS response, or verify multi-provider linked Auth identity. CI's synthetic tests and isolated PGlite database fixture **cannot** substitute for these acceptance tests.

The initial handler returned 403 for `runtime_access_unavailable`. The code on this draft branch now explicitly fails closed with `503 identity_session_check_unavailable` to distinguish unavailable session infrastructure from a true user-denied 403, and performs no code lookup/issuance in that case. The endpoint remains **undeployed**.

## Remaining gates before any account UI or production

1. Reconcile the staging environment's missing `learner_runtime_access_v1(uuid,uuid)` using the exact versioned auth/runtime migration and its dependencies; do **not** create a permissive stub or bypass session checks to make the endpoint appear healthy.
2. Independent security review of the runtime dependency, table grants and service-role handler.
3. Managed staging tests with controlled authenticated synthetic users and real sessions; compare two-user isolation, sign-in method linking, suspended/deleted/revoked-session failure, concurrent first issuance, code uniqueness and error privacy. Revoke/clean up synthetic sessions after evidence capture.
4. Owner decision on the retention conflict: the SQL uses `ON DELETE CASCADE`, so deleted-user codes have no reserved tombstone. **Permanent non-reassignment after erasure is not guaranteed** by the current schema. Clarify deletion and privacy policy before making a global non-reuse promise.
5. After staging acceptance, a separate change for the **learner's own Account → Learner ID** view (copyable persisted code with a non-blocking unavailable state), with a controlled rollout and rollback.

**Decision:** keep PR #379 **draft**, table isolated in staging, authenticated API blocked, and production/learner history unchanged until the above gates are satisfied.
