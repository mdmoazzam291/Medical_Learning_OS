# Learner ID — restored staging runtime session-check parity

**2026-11-02. Isolated staging project:** `medical_learning_os_staging` (`vwtdwafjrraptrgeshzt`). **Production was read-only** throughout this task.

## Verified source of truth

The existing live production `public.learner_runtime_access_v1(uuid,uuid)` was inspected through read-only catalog metadata and `pg_get_functiondef`. The original is a PostgreSQL `STABLE SECURITY DEFINER` function with empty `search_path`, owned by `postgres`, executable **only** by `service_role`. It verifies a matching `auth.sessions(id,user_id)` row and denies missing/deleted/suspended users or mismatched sessions. No payload can make an unauthorised session valid. The routine accepts *two UUIDs as parameters* only from the trusted server API. Its implementation is stored verbatim in `ops/staging/learner-identity/runtime-access-parity.sql`, plus explicit service-role-only privileges.

## Staging change and independent readback

- **Managed migration applied to staging only:** `20261102063520 learner_runtime_access_staging_parity`. See `ops/staging/learner-identity/runtime-access-parity.sql`.
- PostgreSQL `md5(pg_get_functiondef(...))` **production = staging**: `2b4dec44e67e71ec3e1889daa5fdf64c`. This verifies the *actual installed function definition*, rather than merely comparing a proposed source file.
- Both environments report `security_definer=true`, `anon EXECUTE=false`, `authenticated EXECUTE=false`, `service_role EXECUTE=true`.
- A staging call with deliberately nonexistent synthetic UUIDs returned `{allowed:false,reason:"account_unavailable",sessionActive:false}`. No Auth rows or learner codes were inserted.
- `public.learner_reference_codes` still contained **zero** assignments at readback.
- The only Supabase security advisor item was informational `rls_enabled_no_policy` for the intentionally service-only mapping; **do not add a browser RLS policy** in response. [Official advisor explanation](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

## Automated correctness tests

`scripts/learner-runtime-access-parity-db-check.js` exercises this *same* SQL in disposable PostgreSQL, with synthetic users/sessions only in its isolated in-memory database. Its negative cases cover missing/wrong-session, suspended user, deleted user and nonexistent account. It checks the service-only executable ACL. The new CI step runs alongside the existing learner-code table/constraint tests.

## What still requires proof

The deployed **Edge Function** has not been verified here, and live staging Auth/JWT, CORS/session rejection, two authenticated learner isolation, sign-in-provider linking, concurrency and code issuance remain separate acceptance. A green SQL parity digest does not prove an actual authenticated Edge request. This does not authorize production deployment or display of invented codes.

**Rollout boundary:** Staging runtime validation restored; no real learners, content, clinical reviews, exam events, production SQL or learner-history rows were modified. Proceed with the Edge API staging build and real controlled-session tests before enabling the Account Learner ID UX.
